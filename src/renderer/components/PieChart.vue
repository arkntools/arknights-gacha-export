<template>
  <div class="chart mb-2 relative h-48 lg:h-56 xl:h-64 2xl:h-72">
    <div ref="chart" class="absolute inset-0"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUpdated } from 'vue'
import { use, init } from 'echarts/core'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { PieChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import throttle from 'lodash-es/throttle'

use([TitleComponent, TooltipComponent, LegendComponent, PieChart, CanvasRenderer])

const props = defineProps({
  data: Object,
  pool: String,
  i18n: Object
})

const chart = ref(null)

const colors = ['#F44336', '#FF9800', '#AB47BC', '#4CAF50']

const parseData = (detail) => {
  const text = props.i18n.ui.data
  const keys = [
    [text.star6, 'count6'],
    [text.star5, 'count5'],
    [text.star4, 'count4'],
    [text.star3, 'count3']
  ]
  const result = []
  const color = []
  const selected = {
    [text.star3]: !(detail.count5 + detail.count6)
  }
  keys.forEach((key, index) => {
    if (!detail[key[1]]) return
    result.push({
      value: detail[key[1]],
      name: key[0]
    })
    color.push(colors[index])
  })
  return [result, color, selected]
}

let pieChart = null
const updateChart = throttle(() => {
  if (!pieChart) {
    pieChart = init(chart.value)
  }

  const colon = props.i18n.symbol.colon
  const result = parseData(props.data)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: `{b0}${colon}{c0}`,
      padding: 4,
      textStyle: {
        fontSize: 12
      }
    },
    legend: {
      top: '2%',
      left: 'center',
      selected: result[2]
    },
    selectedMode: 'single',
    color: result[1],
    series: [
      {
        type: 'pie',
        top: 50,
        startAngle: 70,
        radius: ['0%', '90%'],
        // avoidLabelOverlap: false,
        labelLine: {
          length: 0,
          length2: 10
        },
        label: {
          overflow: 'break'
        },
        data: result[0]
      }
    ]
  }

  pieChart.setOption(option)
  pieChart.resize()
}, 1000)

onUpdated(() => {
  updateChart()
})

onMounted(() => {
  updateChart()
  window.addEventListener('resize', updateChart)
})
</script>
