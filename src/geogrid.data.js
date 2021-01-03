"use strict"

/****** DATA ******/
export class Data {
  constructor(options) {
    this._options = options
    this._dataById = null
    this._cells = []
    this._geoJSON = null
    
    // init plugins
    this._overwriteColor = {}
    this._overwriteSize = {}
    this._overwriteContourColor = {}
    this._overwriteContourWidth = {}
  }
  getCells() {
    return this._cells
  }
  setCells(cells) {
    this._cells = cells
  }
  getGeoJSON() {
    return this._geoJSON
  }
  _minDataValue(sourceN, key) {
    let min = Infinity
    for (const v of this._dataById[sourceN].values()) {
      if (v[key] === null) continue
      const w = this._dataMap(sourceN, v)[key]
      if (w < min) min = w
    }
    return min
  }
  _maxDataValue(sourceN, key) {
    let max = -Infinity
    for (const v of this._dataById[sourceN].values()) {
      if (v[key] === null) continue
      const w = this._dataMap(sourceN, v)[key]
      if (w > max) max = w
    }
    return max
  }
  updateScales() {
    if (!this._dataById) return
    const t = this
    const computeScale = (sourceN, scale, min, max, key) => {
      if (key === null) return null
      if (scale.length != 2) return scale
      const minComputed = (min != null) ? min : this._minDataValue(sourceN, key)
      const maxComputed = (max != null) ? max : this._maxDataValue(sourceN, key)
      return scale(minComputed, maxComputed)
    }
    this._cellColorScale = {}
    this._cellSizeScale = {}
    // for (const sourceN of Object.keys(this._dataById)) {
    for (const [sourceN, source] of this._options.sources.entries()) {
      this._cellColorScale[sourceN] = computeScale(sourceN, source.cellColorScale, source.cellColorMin, source.cellColorMax, source.cellColorKey)
      this._cellSizeScale[sourceN] = computeScale(sourceN, source.cellSizeScale, source.cellSizeMin, source.cellSizeMax, source.cellSizeKey)
    }
  }
  getOverwriteColor() {
    return this._overwriteColor
  }
  getOverwriteSize() {
    return this._overwriteSize
  }
  getOverwriteContourColor() {
    return this._overwriteContourColor
  }
  getOverwriteContourWidth() {
    return this._overwriteContourWidth
  }
  overwriteColor(id, color) {
    if (color !== null) this._overwriteColor[id] = color
    else delete this._overwriteColor[cell.id]
  }
  overwriteSize(id, size) {
    if (size !== null) this._overwriteSize[id] = size
    else delete this._overwriteSize[cell.id]
  }
  overwriteContourColor(id, color) {
    if (color !== null) this._overwriteContourColor[id] = color
    else delete this._overwriteContourColor[cell.id]
  }
  overwriteContourWidth(id, width) {
    if (width !== null) this._overwriteContourWidth[id] = width
    else delete this._overwriteContourWidth[cell.id]
  }
  resetOverwriteColor() {
    this._overwriteColor = {}
  }
  resetOverwriteSize() {
    this._overwriteSize = {}
  }
  resetOverwriteContourColor() {
    this._overwriteContourColor = {}
  }
  resetOverwriteContourWidth() {
    this._overwriteContourWidth = {}
  }
  cellColor(sourceN, id, properties) {
    const source = this._options.sources[sourceN]
    // return overwritten colour
    if (id in this._overwriteColor) return this._overwriteColor[id]
    // no key
    if (source.cellColorKey === null) return source.cellColorNoKey
    // compute value
    const value = properties[source.cellColorKey]
    // return if empty value
    if (value === null || value === undefined) return source.cellColorNoData
    // return if no scale
    if (this._cellColorScale === null || this._cellColorScale[sourceN] === null) return source.cellColorNoKey
    // compute colour
    return this._cellColorScale[sourceN](value)
  }
  cellSize(sourceN, id, properties, geometry) {
    const source = this._options.sources[sourceN]
    let relativeSize
    // choose overwritten relative size
    if (id in this._overwriteSize) relativeSize = this._overwriteSize[id]
    // no key
    else if (source.cellSizeKey === null) relativeSize = source.cellSizeNoKey
    else {
      // compute value
      const value = properties[source.cellSizeKey]
      // empty value
      if (value === null || value === undefined) relativeSize = source.cellSizeNoData
      // no scale
      else if (this._cellSizeScale === null || this._cellSizeScale[sourceN] === null) relativeSize = source.cellSizeNoKey
      // compute relative size
      else relativeSize = this._cellSizeScale[sourceN](value)
    }
    // if no resize needed, return geometry
    if (relativeSize == 1) return geometry
    // resize geometry
    const centroid = geometry.reduce(([x0, y0], [x1, y1]) => [x0 + x1, y0 + y1]).map(c => c / geometry.length)
    return geometry.map(([x, y]) => [relativeSize * (x - centroid[0]) + centroid[0], relativeSize * (y - centroid[1]) + centroid[1]])
  }
  cellContourColor(id, returnNullOnDefault=false) {
    // return overwritten contour colour
    if (id in this._overwriteContourColor) return this._overwriteContourColor[id]
    // return default value
    return returnNullOnDefault ? null : this._options.cellContourColor
  }
  cellContourWidth(id, returnNullOnDefault=false) {
    // return overwritten contour width
    if (id in this._overwriteContourWidth) return this._overwriteContourWidth[id]
    // return default value
    return returnNullOnDefault ? null : this._options.cellContourWidth
  }
  cacheData(progress) {
    if (this._options.sources === null || this._options.sources.length === 0) return null
    this._dataById = {}
    const dataCells = {data: {}}
    for (const [sourceN, source] of this._options.sources.entries()) {
      if (dataCells.resolution !== undefined && dataCells.resolution !== source.data.resolution) progress.error('All sources must have the same resolution')
      this._dataById[sourceN] = new Map()
      if (!source || !source.data || !source.data.data) continue
      const ds = source.data.data
      for (let i = 0; i < ds.length; i++) {
        const d = ds[i]
        this._dataById[sourceN].set(d.id, d)
        if (!(d.id in dataCells.data)) {
          if (d.lat !== undefined) {
            dataCells.data[d.id] = {
              id: d.id,
              lat: d.lat,
              lon: d.lon,
            }
            if (d.isPentagon !== undefined) dataCells.data[d.id].isPentagon = d.isPentagon
          } else dataCells.data[d.id] = d.id
        }
      }
      for (const k of Object.keys(source.data)) if (k != 'data') dataCells[k] = source.data[k]
      if (source.data.url) source.data.data = true
    }
    dataCells.data = Object.values(dataCells.data)
    return dataCells
  }
  dataKeys(sourceN) {
    if (this._options.sources == null) return []
    const source = this._options.sources[sourceN]
    if (source.dataKeys !== null) return source.dataKeys
    if (this._dataById[sourceN] === undefined || this._dataById[sourceN] === null) return []
    const d = this._dataById[sourceN].values().next().value
    if (d === undefined) return []
    return Object.keys(d).filter(k => !['lat', 'lon', 'isPentagon'].includes(k))
  }
  produceGeoJSON() {
    // update scales
    this.updateScales()
    // preparation for producing GeoJSONs
    const coordinatesForSources = (sources, vertices) => {
      return [vertices]
    }
    const makeFeature = (coordinates, cell, properties) => {
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
        properties: {
          id: cell.id,
          ...properties,
        },
      }
    }
    // produce GeoJSON
    const features = []
    for (let c of this._cells) {
      if (c.vertices !== undefined) {
        const coordinates = coordinatesForSources(this._options.sources, c.vertices)
        for (const sourceN in coordinates) features.push(makeFeature(coordinates[sourceN], c, this.dataForId(sourceN, c.id)))
      }
    }
    this._geoJSON = {
      type: 'FeatureCollection',
      features: features,
    }
  }
  _dataMap(sourceN, d) {
    if (this._options.sources[sourceN].dataMap !== null) return this._options.sources[sourceN].dataMap(d)
    return d
  }
  dataForId(sourceN, id) {
    const d = this._dataById[sourceN].get(id)
    if (d === undefined) return {}
    const d2 = this._dataMap(sourceN, d)
    const properties = {}
    if (this.dataKeys(sourceN)) for (const k of this.dataKeys(sourceN)) properties[k] = d2[k]
    return properties
  }
  dataForIdNotMapped(sourceN, id) {
    const d = this._dataById[sourceN].get(id)
    if (d === undefined) return {}
    return d
  }
  reduceGeoJSON(b) {
    if (!this._geoJSON) return
    // return cached GeoJSON in case of unchanged bounds
    if (b.equals(this._bboxView)) return this._geoJSONreduced
    this._bboxView = b
    // reduce
    this._geoJSONreduced = {
      type: 'FeatureCollection',
      features: [],
    }
    for (let f of this._geoJSON.features) if (b.intersects(L.latLngBounds(f.geometry.coordinates[0].map(c => [c[1], c[0]])))) this._geoJSONreduced.features.push(f)
    // return
    return this._geoJSONreduced
  }
}
