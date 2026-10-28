document.addEventListener('DOMContentLoaded', () => {
    const macrosOptions = {
        series: [34, 33, 33],
        chart: {
            type: 'donut',
            height: 320,
            fontFamily: 'inherit',
            animations: {enabled: true, speed: 800}
        },
        labels: ['Fats', 'Proteins', 'Carbs'],
        colors: ['#fde047', '#f8f9fa', '#0dcaf0'],
        plotOptions: {
            pie: {
                donut: {size: '45%'},
                expandOnClick: false
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val.toFixed(0) + "%"
            },
            style: {
                fontSize: '24px',
                fontWeight: '600',
                colors: ['#212529', '#212529']
            },
            dropShadow: {enabled: false}
        },
        stroke: {show: false},
        legend: {show: false},
        tooltip: {enabled: false}
    };

    const macrosChart = new ApexCharts(document.querySelector("#macrosChart"), macrosOptions);
    macrosChart.render();

    const nutriscoreOptions = {
        series: [],
        chart: {
            type: 'bar',
            height: 350,
            stacked: true,
            stackType: '100%',
            fontFamily: 'inherit',
            toolbar: {show: false}
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '25%',
                borderRadius: 0
            },
        },
        colors: ['#00e676', '#69ffa8', '#c6ff00', '#ffca28', '#ff5252'],
        dataLabels: {enabled: false},
        stroke: {width: 0},
        xaxis: {
            categories: [],
            axisBorder: {show: false},
            axisTicks: {show: false},
            labels: {
                style: {fontSize: '14px', fontWeight: 500, colors: '#212529'}
            }
        },
        yaxis: {
            show: true,
            labels: {
                formatter: (val) => val + "%",
                style: {fontSize: '13px', fontWeight: 500}
            }
        },
        grid: {
            borderColor: 'rgba(0,0,0,0.05)',
            strokeDashArray: 4
        },
        legend: {show: false}
    };

    const nutriscoreChart = new ApexCharts(document.querySelector("#nutriscoreChart"), nutriscoreOptions);
    nutriscoreChart.render();

    fetch('/api/expense-details/')
        .then(res => res.json())
        .then(data => {
            macrosChart.updateSeries(data.macros);

            nutriscoreChart.updateOptions({
                xaxis: {categories: data.areas}
            });

            nutriscoreChart.updateSeries([
                {name: 'Nutriscore A', data: data.nutriscore['A']},
                {name: 'Nutriscore B', data: data.nutriscore['B']},
                {name: 'Nutriscore C', data: data.nutriscore['C']},
                {name: 'Nutriscore D', data: data.nutriscore['D']},
                {name: 'Nutriscore E', data: data.nutriscore['E']}
            ]);
        })
        .catch(err => console.error("Error loading expense details:", err));
});