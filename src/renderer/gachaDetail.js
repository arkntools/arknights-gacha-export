import _ from 'lodash-es'

const itemCount = (map, name) => {
  if (!map.has(name)) {
    map.set(name, 1)
  } else {
    map.set(name, map.get(name) + 1)
  }
}

const gachaDetail = (data) => {
  const detailMap = new Map()
  const poolMap = _.groupBy(data, 'pool')
  for (const [pool, list] of Object.entries(poolMap)) {
    const detail = {
      count3: 0,
      count4: 0,
      count5: 0,
      count6: 0,
      char5: new Map(),
      char6: new Map(),
      date: [],
      ssrPos: [],
      countMio: 0,
      total: 0
    }
    let lastSSR = 0
    let dateMin = 0
    let dateMax = 0

    const flatList = list.flatMap(({ ts, chars }) => chars.map((item) => ({ ...item, ts: ts * 1000 })))
    detail.total = flatList.length

    flatList.forEach(({ ts, name, rarity }, index) => {
      const timestamp = new Date(ts).getTime()
      if (!dateMin) dateMin = timestamp
      if (!dateMax) dateMax = timestamp
      if (dateMin > timestamp) dateMin = timestamp
      if (dateMax < timestamp) dateMax = timestamp
      switch (rarity + 1) {
        case 3:
          detail.count3++
          detail.countMio++
          break
        case 4:
          detail.count4++
          detail.countMio++
          break
        case 5:
          detail.count5++
          detail.countMio++
          break
        case 6:
          detail.ssrPos.push([name, index + 1 - lastSSR, ts, pool])
          lastSSR = index + 1
          detail.count6++
          detail.countMio = 0
          itemCount(detail.char5, name)
      }
    })
    detail.date = [dateMin, dateMax]
    if (detail.total) {
      detailMap.set(pool, detail)
    }
  }
  return _.sortBy(Array.from(detailMap.entries()), ([, item]) => -item.date[1])
}

export default gachaDetail
