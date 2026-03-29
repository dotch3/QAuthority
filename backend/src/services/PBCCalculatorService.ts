interface DataPoint { date: string; value: number }
interface XmRResult {
  centralLine: number
  upperLimit: number
  lowerLimit: number
  dataPoints: (DataPoint & { movingRange: number | null })[]
}
type SignalType = 'OUTSIDE_LIMIT' | 'RUN' | 'TREND'
interface Signal { date: string; type: SignalType }

export class PBCCalculatorService {
  computeXmR(dataPoints: DataPoint[]): XmRResult {
    if (dataPoints.length < 2) {
      throw new Error('Need at least 2 data points for XmR calculation')
    }

    const mean = dataPoints.reduce((s, p) => s + p.value, 0) / dataPoints.length

    const withMR = dataPoints.map((p, i) => ({
      ...p,
      movingRange: i === 0 ? null : Math.abs(p.value - dataPoints[i - 1].value),
    }))

    const mRValues = withMR.slice(1).map(p => p.movingRange as number)
    const mRBar = mRValues.reduce((s, v) => s + v, 0) / mRValues.length

    return {
      centralLine: mean,
      upperLimit: mean + 2.66 * mRBar,
      lowerLimit: mean - 2.66 * mRBar,
      dataPoints: withMR,
    }
  }

  detectSignals(dataPoints: DataPoint[], limits: XmRResult): Signal[] {
    const signals: Signal[] = []
    const { centralLine, upperLimit, lowerLimit } = limits

    for (const p of dataPoints) {
      if (p.value > upperLimit || p.value < lowerLimit) {
        signals.push({ date: p.date, type: 'OUTSIDE_LIMIT' })
      }
    }

    let runCount = 1
    for (let i = 1; i < dataPoints.length; i++) {
      const prevAbove = dataPoints[i - 1].value >= centralLine
      const currAbove = dataPoints[i].value >= centralLine
      if (prevAbove === currAbove) {
        runCount++
        if (runCount === 8) {
          signals.push({ date: dataPoints[i].date, type: 'RUN' })
        }
      } else {
        runCount = 1
      }
    }

    let trendCount = 1
    for (let i = 1; i < dataPoints.length; i++) {
      const goingUp = dataPoints[i].value > dataPoints[i - 1].value
      const prevGoingUp = i > 1 ? dataPoints[i - 1].value > dataPoints[i - 2].value : goingUp
      if (goingUp === prevGoingUp) {
        trendCount++
        if (trendCount >= 6) {
          signals.push({ date: dataPoints[i].date, type: 'TREND' })
        }
      } else {
        trendCount = 1
      }
    }

    return signals
  }
}
