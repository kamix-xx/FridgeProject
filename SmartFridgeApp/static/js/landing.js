document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById('ascii-oranges-container');
    const heroSection = document.getElementById('hero-section');
    const ambientBlob = document.getElementById('ambient-cursor-blob');
    if (!container || typeof THREE === 'undefined' || container.dataset.initialized === 'true') return;
    container.dataset.initialized = 'true';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(47, 1, 0.1, 500);
    camera.position.set(0, 0, 104);

    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: 'low-power'
    });
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.style.display = 'none';

    const asciiCanvas = document.createElement('canvas');
    asciiCanvas.className = 'ascii-art-canvas';
    asciiCanvas.setAttribute('aria-hidden', 'true');
    container.appendChild(asciiCanvas);
    const ctx = asciiCanvas.getContext('2d', {alpha: true});
    const sampleCanvas = document.createElement('canvas');
    const sampleCtx = sampleCanvas.getContext('2d', {willReadFrequently: true});
    sampleCtx.imageSmoothingEnabled = false;

    const glyphs = ' .,:;irsXA253hMHGS#9B&@';
    const objects = [];
    let grid = {
        cols: 120,
        rows: 48,
        width: container.clientWidth || window.innerWidth,
        height: container.clientHeight || 420,
        dpr: 1,
        fontSize: 9
    };
    let mouseX = 0;
    let mouseY = 0;
    let pointerActive = false;
    let frameId = 0;
    let lastFrame = 0;
    let elapsed = 0;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Add these two lines to track smooth scrolling:
    let currentScrollY = window.scrollY;
    let lastScrollY = window.scrollY;

    function makePeelTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const textureCtx = canvas.getContext('2d');
        textureCtx.fillStyle = '#c8c8c8';
        textureCtx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2200; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const radius = Math.random() * 1.05 + 0.2;
            const shade = Math.random();
            textureCtx.fillStyle = shade > 0.53 ? 'rgba(255,255,255,0.55)' : 'rgba(45,45,45,0.30)';
            textureCtx.beginPath();
            textureCtx.arc(x, y, radius, 0, Math.PI * 2);
            textureCtx.fill();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    const peelTexture = makePeelTexture();
    const fruitMaterials = ['#e95725', '#f16a31', '#e64d1e', '#f1783d', '#cf481f'].map(color =>
        new THREE.MeshStandardMaterial({
            color,
            map: peelTexture,
            bumpMap: peelTexture,
            bumpScale: 0.12,
            roughness: 0.82,
            metalness: 0
        })
    );
    const rindMaterial = new THREE.MeshStandardMaterial({
        color: '#ed5b28',
        roughness: 0.76,
        map: peelTexture,
        bumpMap: peelTexture,
        bumpScale: 0.12
    });
    const pithMaterial = new THREE.MeshStandardMaterial({
        color: '#f1d4bf',
        roughness: 0.92,
        side: THREE.DoubleSide
    });
    const fleshMaterials = ['#f15e2b', '#f77c43', '#ed4d22', '#d9471e', '#fa8b56'].map(color =>
        new THREE.MeshStandardMaterial({color, roughness: 0.74, side: THREE.DoubleSide})
    );
    const leafMaterial = new THREE.MeshStandardMaterial({
        color: '#57943b',
        roughness: 0.88,
        side: THREE.DoubleSide
    });
    const leafLightMaterial = new THREE.MeshStandardMaterial({
        color: '#7dbb45',
        roughness: 0.82,
        side: THREE.DoubleSide
    });
    const calyxMaterial = new THREE.MeshStandardMaterial({color: '#356d2b', roughness: 0.9});
    const stemMaterial = new THREE.MeshStandardMaterial({color: '#6d4230', roughness: 1});
    const glintMaterial = new THREE.MeshStandardMaterial({color: '#e96036', roughness: 0.76});

    function makeMandarinGeometry(phase) {
        const geometry = new THREE.SphereGeometry(1, 30, 22);
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);
            const equator = Math.sqrt(Math.max(0, 1 - y * y));
            const angle = Math.atan2(z, x);
            const lobes = 1 + Math.cos(angle * 7 + phase) * 0.035 * Math.pow(equator, 0.6);
            const dimple = Math.sign(y) * 1.22 * Math.pow(Math.abs(y), 18);
            position.setXYZ(i, x * 8.1 * lobes, y * 6.45 - dimple, z * 7.65 * lobes);
        }
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        return geometry;
    }

    const mandarinGeometries = [0, 0.7, 1.6, 2.5].map(makeMandarinGeometry);

    function makeLeafGeometry(length = 4.5, width = 1.25) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.quadraticCurveTo(length * 0.27, width, length * 0.62, width * 0.63);
        shape.quadraticCurveTo(length * 0.9, width * 0.28, length, 0);
        shape.quadraticCurveTo(length * 0.6, -width * 0.65, 0, 0);
        return new THREE.ShapeGeometry(shape, 8);
    }

    const leafGeometry = makeLeafGeometry();
    const smallLeafGeometry = makeLeafGeometry(2.8, 0.85);

    function addMotion(object, options = {}) {
        const width = grid.width || container.clientWidth || 800;
        const height = grid.height || container.clientHeight || 420;
        const viewHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const viewWidth = viewHeight * Math.max(0.45, width / Math.max(height, 1));
        const rightBias = width > 760 && options.rightBias !== false;
        const spawnX = rightBias
            ? (Math.random() * 0.46 - 0.04) * viewWidth
            : (Math.random() - 0.5) * viewWidth * 0.84;
        object.position.set(
            spawnX,
            (Math.random() - 0.5) * viewHeight * 0.88,
            (Math.random() - 0.5) * 34
        );
        object.rotation.set(
            (Math.random() - 0.5) * (options.tilt || 0.7),
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        object.userData.baseVelocity = new THREE.Vector3(
            (Math.random() - 0.5) * (options.speed || 0.09),
            (Math.random() - 0.5) * (options.speed || 0.09),
            (Math.random() - 0.5) * 0.035
        );
        object.userData.velocity = object.userData.baseVelocity.clone();
        object.userData.rotVelocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.005,
            (Math.random() - 0.5) * 0.006,
            (Math.random() - 0.5) * 0.006
        );
        object.userData.phase = Math.random() * Math.PI * 2;
        object.userData.baseScale = object.scale.x || 1;
        object.userData.radius = options.radius || 7;
        scene.add(object);
        objects.push(object);
        return object;
    }

    function makeMandarin() {
        const group = new THREE.Group();
        const body = new THREE.Mesh(
            mandarinGeometries[Math.floor(Math.random() * mandarinGeometries.length)],
            fruitMaterials[Math.floor(Math.random() * fruitMaterials.length)]
        );
        group.add(body);

        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.36, 1.05, 7), stemMaterial);
        stem.position.set(0, 5.35, 0);
        stem.rotation.z = -0.13;
        group.add(stem);

        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const sepal = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), calyxMaterial);
            sepal.scale.set(0.92, 0.15, 0.32);
            sepal.position.set(Math.cos(angle) * 0.58, 5.12, Math.sin(angle) * 0.58);
            sepal.rotation.y = -angle;
            sepal.rotation.z = Math.sin(angle) * 0.22;
            group.add(sepal);
        }

        if (Math.random() > 0.22) {
            const leaf = new THREE.Mesh(leafGeometry, Math.random() > 0.5 ? leafMaterial : leafLightMaterial);
            leaf.position.set(0.25, 5.25, 0.2);
            leaf.rotation.set(-0.25, (Math.random() - 0.5) * 0.8, Math.random() * 0.8 - 0.35);
            group.add(leaf);
        }
        const scale = 0.68 + Math.random() * 0.54;
        group.scale.setScalar(scale);
        return addMotion(group, {radius: 9 * scale, speed: 0.075, tilt: 0.45});
    }

    function makeWedgeGeometry(start, end, radius) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(radius * Math.cos(start), radius * Math.sin(start));
        shape.absarc(0, 0, radius, start, end, false);
        shape.lineTo(0, 0);
        shape.closePath();
        return new THREE.ShapeGeometry(shape, 3);
    }

    function makeMandarinSlice() {
        const group = new THREE.Group();
        const rind = new THREE.Mesh(new THREE.CylinderGeometry(6.15, 6.15, 1.15, 48, 1, false), rindMaterial);
        rind.rotation.x = Math.PI / 2;
        group.add(rind);

        const pith = new THREE.Mesh(new THREE.CircleGeometry(5.72, 48), pithMaterial);
        pith.position.z = 0.585;
        group.add(pith);

        const segmentCount = 10;
        const arc = (Math.PI * 2) / segmentCount;
        for (let i = 0; i < segmentCount; i++) {
            const gap = 0.035;
            const segment = new THREE.Mesh(
                makeWedgeGeometry(i * arc + gap, (i + 1) * arc - gap, 5.28),
                fleshMaterials[i % fleshMaterials.length]
            );
            segment.position.z = 0.615;
            group.add(segment);
        }

        const core = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), pithMaterial);
        core.position.z = 0.64;
        group.add(core);

        if (Math.random() > 0.35) {
            for (let i = 0; i < 2; i++) {
                const seed = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), pithMaterial);
                const angle = Math.random() * Math.PI * 2;
                const radius = 1.25 + Math.random() * 1.8;
                seed.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.67);
                seed.scale.set(0.7, 1.45, 0.5);
                group.add(seed);
            }
        }
        const scale = 0.55 + Math.random() * 0.62;
        group.scale.setScalar(scale);
        const item = addMotion(group, {radius: 7 * scale, speed: 0.11, tilt: 0.28});
        item.rotation.x = (Math.random() - 0.5) * 0.35;
        item.rotation.y = (Math.random() - 0.5) * 0.35;
        return item;
    }

    function makePeelCurl() {
        const points = [];
        const turns = 2.15;
        for (let i = 0; i <= 52; i++) {
            const t = i / 52;
            const angle = t * Math.PI * 2 * turns;
            const radius = 0.35 + t * 2.25;
            points.push(new THREE.Vector3(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                Math.sin(t * Math.PI * 3) * 0.75
            ));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, 64, 0.22, 5, false);
        const peelMaterial = new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? '#ef7744' : '#d94b25',
            roughness: 0.7,
            map: peelTexture,
            bumpMap: peelTexture,
            bumpScale: 0.07
        });
        const group = new THREE.Group();
        group.add(new THREE.Mesh(geometry, peelMaterial));
        group.scale.setScalar(0.65 + Math.random() * 0.6);
        return addMotion(group, {radius: 4, speed: 0.12, tilt: 1.3});
    }

    function makeFloatingLeaf() {
        const group = new THREE.Group();
        const leaf = new THREE.Mesh(smallLeafGeometry, Math.random() > 0.5 ? leafMaterial : leafLightMaterial);
        leaf.rotation.z = (Math.random() - 0.5) * 0.45;
        group.add(leaf);
        group.scale.setScalar(0.45 + Math.random() * 0.75);
        return addMotion(group, {radius: 3, speed: 0.15, tilt: 1.5});
    }

    scene.add(new THREE.HemisphereLight(0xffd5c5, 0x263b2d, 0.82));
    scene.add(new THREE.AmbientLight(0xffffff, 0.46));
    const keyLight = new THREE.PointLight(0xff8056, 1.8, 260);
    keyLight.position.set(34, 45, 58);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0xee4f25, 1.1, 220);
    fillLight.position.set(-48, -24, 25);
    scene.add(fillLight);
    const leafLight = new THREE.PointLight(0x6aa36a, 0.48, 180);
    leafLight.position.set(-42, 38, -20);
    scene.add(leafLight);

    for (let i = 0; i < 11; i++) makeMandarin();
    for (let i = 0; i < 8; i++) makeMandarinSlice();
    for (let i = 0; i < 5; i++) makePeelCurl();
    for (let i = 0; i < 9; i++) makeFloatingLeaf();

    const fleckGeometry = new THREE.IcosahedronGeometry(0.24, 0);
    for (let i = 0; i < 24; i++) {
        const fleck = new THREE.Mesh(fleckGeometry, i % 3 === 0 ? glintMaterial : fruitMaterials[i % fruitMaterials.length]);
        const scale = 0.45 + Math.random() * 1.1;
        fleck.scale.setScalar(scale);
        addMotion(fleck, {radius: 0.5, speed: 0.18, tilt: 2.5});
    }

    function resize() {
        const rect = container.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width || heroSection?.clientWidth || window.innerWidth));
        const height = Math.max(1, Math.round(rect.height || heroSection?.clientHeight || 420));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const fontSize = width < 540 ? 7 : width < 1000 ? 8 : 9;
        const cols = Math.max(58, Math.min(190, Math.floor(width / (fontSize * 0.72))));
        const rows = Math.max(30, Math.min(86, Math.floor(height / (fontSize * 1.15))));
        grid = {cols, rows, width, height, dpr, fontSize};

        asciiCanvas.width = Math.round(width * dpr);
        asciiCanvas.height = Math.round(height * dpr);
        asciiCanvas.style.width = '100%';
        asciiCanvas.style.height = '100%';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        sampleCanvas.width = cols;
        sampleCanvas.height = rows;
        sampleCtx.imageSmoothingEnabled = false;
        renderer.setSize(cols, rows, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    function drawAscii() {
        renderer.render(scene, camera);
        sampleCtx.clearRect(0, 0, grid.cols, grid.rows);
        sampleCtx.drawImage(renderer.domElement, 0, 0, grid.cols, grid.rows);
        const pixels = sampleCtx.getImageData(0, 0, grid.cols, grid.rows).data;
        const cellWidth = grid.width / grid.cols;
        const cellHeight = grid.height / grid.rows;
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark' ||
            document.body.getAttribute('data-bs-theme') === 'dark';
        ctx.clearRect(0, 0, grid.width, grid.height);

        ctx.globalAlpha = 1;
        for (let y = 0; y < grid.rows; y++) {
            for (let x = 0; x < grid.cols; x++) {
                const p = (y * grid.cols + x) * 4;
                const alpha = pixels[p + 3] / 255;
                if (alpha < 0.08) continue;
                let r = pixels[p];
                let g = pixels[p + 1];
                let b = pixels[p + 2];
                let luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                luminance = Math.max(0, Math.min(1, (luminance - 0.015) / 0.78));
                luminance = Math.pow(luminance, 0.78);
                const glyphIndex = Math.min(glyphs.length - 1, Math.floor(luminance * (glyphs.length - 1)));
                const glyph = glyphs[glyphIndex];
                if (glyph === ' ') continue;

                if (r > g * 1.12 && r > b * 1.28) {
                    r = r * 0.62 + 228 * 0.38;
                    g = g * 0.66 + 83 * 0.34;
                    b = b * 0.7 + 48 * 0.3;
                }
                ctx.globalAlpha = isDark ? Math.min(0.94, 0.52 + luminance * 0.36) : Math.min(0.95, 0.45 + luminance * 0.50);
                ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
                ctx.fillText(glyph, x * cellWidth, y * cellHeight);
            }
        }
        ctx.globalAlpha = 1;
    }

    function pointFromEvent(event) {
        const rect = heroSection.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
        const viewHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        mouseX = nx * viewHeight * camera.aspect / 2;
        mouseY = ny * viewHeight / 2;
        if (ambientBlob) {
            ambientBlob.style.left = `${event.clientX - rect.left}px`;
            ambientBlob.style.top = `${event.clientY - rect.top}px`;
            ambientBlob.classList.add('is-active');
        }
    }

    if (heroSection) {
        heroSection.addEventListener('pointermove', event => {
            pointerActive = true;
            pointFromEvent(event);
        }, {passive: true});
        heroSection.addEventListener('pointerleave', () => {
            pointerActive = false;
            if (ambientBlob) {
                ambientBlob.classList.remove('is-active');
                ambientBlob.style.left = '50%';
                ambientBlob.style.top = '50%';
            }
        }, {passive: true});

        heroSection.addEventListener('pointerdown', event => {
            pointerActive = true;
            pointFromEvent(event);
            const rect = heroSection.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'citrus-interaction-ripple';
            ripple.style.left = `${event.clientX - rect.left}px`;
            ripple.style.top = `${event.clientY - rect.top}px`;
            heroSection.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove(), {once: true});

            const cx = mouseX;
            const cy = mouseY;
            objects.forEach(object => {
                const dx = object.position.x - cx;
                const dy = object.position.y - cy;
                const distance = Math.hypot(dx, dy);
                if (distance < 108) {
                    const falloff = 1 - distance / 108;
                    const safeDistance = Math.max(distance, 0.01);
                    object.userData.velocity.x += (dx / safeDistance) * (0.34 + 0.55 * falloff);
                    object.userData.velocity.y += (dy / safeDistance) * (0.34 + 0.55 * falloff);
                    object.userData.velocity.z += 0.12 + 0.2 * falloff;
                    object.userData.rotVelocity.z += (Math.random() - 0.5) * 0.09;
                    object.userData.clickStrength = Math.max(object.userData.clickStrength || 0, falloff);
                }
            });
        }, {passive: true});
    }

    function animate(timestamp) {
        frameId = requestAnimationFrame(animate);
        if (document.hidden) return;
        if (timestamp - lastFrame < 42) return;
        const step = lastFrame ? Math.min((timestamp - lastFrame) / 16.67, 2.2) : 1;
        lastFrame = timestamp;
        elapsed += step * 0.0167;

        // 1. Calculate smooth container momentum
        const targetScrollY = window.scrollY;
        currentScrollY += (targetScrollY - currentScrollY) * 0.08 * step;
        const scrollVelocity = currentScrollY - lastScrollY;
        lastScrollY = currentScrollY;

        objects.forEach(object => {
            const velocity = object.userData.velocity;
            const baseVelocity = object.userData.baseVelocity;
            const dx = mouseX - object.position.x;
            const dy = mouseY - object.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 2. INJECT FLUID INERTIA
            // When scrolling, the fluid drags the fruit. We apply a slight opposing force
            // to their velocity and add a tumbling rotation to simulate liquid friction.
            velocity.y -= scrollVelocity * 0.0008 * step;
            object.userData.rotVelocity.x -= scrollVelocity * 0.00008 * step;
            object.userData.rotVelocity.z += scrollVelocity * 0.00004 * step;

            let hoverStrength = 0;
            if (pointerActive && distance < 82) {
                const falloff = 1 - distance / 82;
                hoverStrength = falloff;
                velocity.x += dx * 0.00030 * falloff * step - dy * 0.00034 * falloff * step;
                velocity.y += dy * 0.00030 * falloff * step + dx * 0.00034 * falloff * step;
                velocity.z += 0.009 * falloff * step;
                object.userData.rotVelocity.x += dy * 0.000045 * falloff * step;
                object.userData.rotVelocity.y += dx * 0.00004 * falloff * step;
                object.userData.rotVelocity.z += (dx - dy) * 0.000012 * falloff * step;
            } else {
                velocity.lerp(baseVelocity, 0.012 * step);
            }
            object.userData.clickStrength = (object.userData.clickStrength || 0) * Math.pow(0.92, step);

            object.position.addScaledVector(velocity, step);
            object.rotation.x += object.userData.rotVelocity.x * step;
            object.rotation.y += (object.userData.rotVelocity.y + 0.0018) * step;
            object.rotation.z += object.userData.rotVelocity.z * step;
            object.userData.rotVelocity.multiplyScalar(Math.pow(0.992, step));
            velocity.multiplyScalar(Math.pow(0.986, step));

            const clickPop = object.userData.clickStrength || 0;
            const pulse = 1 + Math.sin(elapsed * 1.1 + object.userData.phase) * 0.018 + hoverStrength * 0.17 + clickPop * 0.13;
            object.scale.setScalar(object.userData.baseScale * pulse);

            const depth = camera.position.z - object.position.z;
            const halfHeight = depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
            const halfWidth = halfHeight * camera.aspect;
            const margin = object.userData.radius;
            const boundX = Math.max(8, halfWidth - margin);
            const boundY = Math.max(8, halfHeight - margin);
            if (object.position.x > boundX || object.position.x < -boundX) {
                object.position.x = THREE.MathUtils.clamp(object.position.x, -boundX, boundX);
                velocity.x *= -0.82;
            }
            if (object.position.y > boundY || object.position.y < -boundY) {
                object.position.y = THREE.MathUtils.clamp(object.position.y, -boundY, boundY);
                velocity.y *= -0.82;
            }
            if (object.position.z < -23) { object.position.z = -23; velocity.z = Math.abs(velocity.z) + 0.01; }
            if (object.position.z > 17) { object.position.z = 17; velocity.z = -Math.abs(velocity.z) - 0.01; }
        });

        camera.position.x += ((pointerActive ? mouseX * 0.025 : 0) - camera.position.x) * 0.018 * step;
        camera.position.y += ((pointerActive ? mouseY * 0.025 : 0) - camera.position.y) * 0.018 * step;
        camera.lookAt(0, 0, 0);

        // 3. Apply the smoothed parallax momentum to the container
        scene.position.y = currentScrollY * 0.045;

        drawAscii();
    }

    resize();
    drawAscii();
    if (!reducedMotion) frameId = requestAnimationFrame(animate);
    window.addEventListener('resize', resize, {passive: true});
    window.addEventListener('pagehide', () => {
        if (frameId) cancelAnimationFrame(frameId);
        renderer.dispose();
        peelTexture.dispose();
    }, {once: true});
});