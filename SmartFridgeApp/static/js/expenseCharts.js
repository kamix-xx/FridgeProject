document.addEventListener('DOMContentLoaded', () => {
    const chartElement = document.querySelector("#expenseChart");
    const totalElement = document.querySelector("#expenseTotal");


    // '#198754' (Bootstrap success green),  '#10b981' (szmaragdowa zieleń)
    const options = {
        series: [{ name: 'Spent', data: [] }],
        chart: {
            type: 'area',
            height: 350,
            fontFamily: 'inherit',
            toolbar: { show: false },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800
            }
        },
        colors: ['#fd7e14'],
        dataLabels: { enabled: false },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.45,
                opacityTo: 0.05,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            type: 'datetime',
            tooltip: { enabled: false }
        },
        yaxis: {
            labels: {
                formatter: (val) => val.toFixed(2) + " USD"
            }
        },
        tooltip: {
            theme: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light',
            y: { formatter: (val) => val.toFixed(2) + " USD" }
        }
    };

    const chart = new ApexCharts(chartElement, options);
    chart.render();

    const fetchExpenses = () => {
        const startInput = document.querySelector("#startDate");
        const endInput = document.querySelector("#endDate");

        if (!startInput || !endInput) return;

        const start = startInput.value;
        const end = endInput.value;

        let url = '/api/expenses/';
        if (start || end) {
            url += `?start=${start}&end=${end}`;
        }

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (!startInput.value) {
                    startInput.value = data.start_date;
                    startInput.dispatchEvent(new Event('change', {bubbles: true}));
                }
                if (!endInput.value) {
                    endInput.value = data.end_date;
                    endInput.dispatchEvent(new Event('change', {bubbles: true}));
                }

                chart.updateSeries([{
                    name: 'Spent',
                    data: data.data
                }]);

                if (totalElement) {
                    totalElement.textContent = data.total_sum.toFixed(2) + " USD";
                }
            })
            .catch(err => console.error("Error loading expenses:", err));
    };

    fetchExpenses();

    document.addEventListener('change', (e) => {
        if (e.target && (e.target.id === 'startDate' || e.target.id === 'endDate')) {
            fetchExpenses();
        }
    });
});