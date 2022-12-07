(() => {
  // scripts/common.js
  async function delay(ms) {
    if (typeof window !== "undefined") {
      return new Promise((exec) => window.setTimeout(exec, ms));
    } else {
      return new Promise((exec) => exec);
    }
  }
  var CancellationToken = class {
    isCancelled = false;
  };

  // scripts/lib/clustering.js
  var Vector = class {
    values;
    weight;
    tag;
    constructor(values, weight = 1) {
      this.values = values;
      this.weight = weight;
    }
    distanceTo(p) {
      let sumSquares = 0;
      for (let i = 0; i < this.values.length; i++) {
        sumSquares += (p.values[i] - this.values[i]) * (p.values[i] - this.values[i]);
      }
      return Math.sqrt(sumSquares);
    }
    static average(pts) {
      if (pts.length === 0) {
        throw Error("Can't average 0 elements");
      }
      const dims = pts[0].values.length;
      const values = [];
      for (let i = 0; i < dims; i++) {
        values.push(0);
      }
      let weightSum = 0;
      for (const p of pts) {
        weightSum += p.weight;
        for (let i = 0; i < dims; i++) {
          values[i] += p.weight * p.values[i];
        }
      }
      for (let i = 0; i < values.length; i++) {
        values[i] /= weightSum;
      }
      return new Vector(values);
    }
  };
  var KMeans = class {
    points;
    k;
    random;
    currentIteration = 0;
    pointsPerCategory = [];
    centroids = [];
    currentDeltaDistanceDifference = 0;
    constructor(points, k, random, centroids = null) {
      this.points = points;
      this.k = k;
      this.random = random;
      if (centroids != null) {
        this.centroids = centroids;
        for (let i = 0; i < this.k; i++) {
          this.pointsPerCategory.push([]);
        }
      } else {
        this.initCentroids();
      }
    }
    initCentroids() {
      for (let i = 0; i < this.k; i++) {
        this.centroids.push(this.points[Math.floor(this.points.length * this.random.next())]);
        this.pointsPerCategory.push([]);
      }
    }
    step() {
      for (let i = 0; i < this.k; i++) {
        this.pointsPerCategory[i] = [];
      }
      for (const p of this.points) {
        let minDist = Number.MAX_VALUE;
        let centroidIndex = -1;
        for (let k = 0; k < this.k; k++) {
          const dist = this.centroids[k].distanceTo(p);
          if (dist < minDist) {
            centroidIndex = k;
            minDist = dist;
          }
        }
        this.pointsPerCategory[centroidIndex].push(p);
      }
      let totalDistanceDiff = 0;
      for (let k = 0; k < this.pointsPerCategory.length; k++) {
        const cat = this.pointsPerCategory[k];
        if (cat.length > 0) {
          const avg = Vector.average(cat);
          const dist = this.centroids[k].distanceTo(avg);
          totalDistanceDiff += dist;
          this.centroids[k] = avg;
        }
      }
      this.currentDeltaDistanceDifference = totalDistanceDiff;
      this.currentIteration++;
    }
  };

  // scripts/lib/colorconversion.js
  function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
        default:
          h = 0;
      }
      h /= 6;
    }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p2, q2, t) => {
        if (t < 0) {
          t += 1;
        }
        if (t > 1) {
          t -= 1;
        }
        if (t < 1 / 6) {
          return p2 + (q2 - p2) * 6 * t;
        }
        if (t < 1 / 2) {
          return q2;
        }
        if (t < 2 / 3) {
          return p2 + (q2 - p2) * (2 / 3 - t) * 6;
        }
        return p2;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
  }
  function lab2rgb(lab) {
    let y = (lab[0] + 16) / 116, x = lab[1] / 500 + y, z = y - lab[2] / 200, r, g, b;
    x = 0.95047 * (x * x * x > 8856e-6 ? x * x * x : (x - 16 / 116) / 7.787);
    y = 1 * (y * y * y > 8856e-6 ? y * y * y : (y - 16 / 116) / 7.787);
    z = 1.08883 * (z * z * z > 8856e-6 ? z * z * z : (z - 16 / 116) / 7.787);
    r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    b = x * 0.0557 + y * -0.204 + z * 1.057;
    r = r > 31308e-7 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 31308e-7 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 31308e-7 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;
    return [
      Math.max(0, Math.min(1, r)) * 255,
      Math.max(0, Math.min(1, g)) * 255,
      Math.max(0, Math.min(1, b)) * 255
    ];
  }
  function rgb2lab(rgb) {
    let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, x, y, z;
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    x = x > 8856e-6 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
    y = y > 8856e-6 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
    z = z > 8856e-6 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }

  // scripts/settings.js
  var ClusteringColorSpace;
  (function(ClusteringColorSpace2) {
    ClusteringColorSpace2[ClusteringColorSpace2["RGB"] = 0] = "RGB";
    ClusteringColorSpace2[ClusteringColorSpace2["HSL"] = 1] = "HSL";
    ClusteringColorSpace2[ClusteringColorSpace2["LAB"] = 2] = "LAB";
  })(ClusteringColorSpace || (ClusteringColorSpace = {}));
  var Settings = class {
    kMeansNrOfClusters = 16;
    kMeansMinDeltaDifference = 1;
    kMeansClusteringColorSpace = ClusteringColorSpace.RGB;
    kMeansColorRestrictions = [];
    colorAliases = {};
    narrowPixelStripCleanupRuns = 3;
    removeFacetsSmallerThanNrOfPoints = 20;
    removeFacetsFromLargeToSmall = true;
    maximumNumberOfFacets = Number.MAX_VALUE;
    nrOfTimesToHalveBorderSegments = 2;
    resizeImageIfTooLarge = true;
    resizeImageWidth = 1024;
    resizeImageHeight = 1024;
    randomSeed = new Date().getTime();
  };

  // scripts/structs/typedarrays.js
  var Uint32Array2D = class {
    width;
    height;
    arr;
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.arr = new Uint32Array(width * height);
    }
    get(x, y) {
      return this.arr[y * this.width + x];
    }
    set(x, y, value) {
      this.arr[y * this.width + x] = value;
    }
  };
  var Uint8Array2D = class {
    width;
    height;
    arr;
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.arr = new Uint8Array(width * height);
    }
    get(x, y) {
      return this.arr[y * this.width + x];
    }
    set(x, y, value) {
      this.arr[y * this.width + x] = value;
    }
    matchAllAround(x, y, value) {
      const idx = y * this.width + x;
      return x - 1 >= 0 && this.arr[idx - 1] === value && (y - 1 >= 0 && this.arr[idx - this.width] === value) && (x + 1 < this.width && this.arr[idx + 1] === value) && (y + 1 < this.height && this.arr[idx + this.width] === value);
    }
  };
  var BooleanArray2D = class {
    width;
    height;
    arr;
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.arr = new Uint8Array(width * height);
    }
    get(x, y) {
      return this.arr[y * this.width + x] !== 0;
    }
    set(x, y, value) {
      this.arr[y * this.width + x] = value ? 1 : 0;
    }
  };

  // scripts/random.js
  var Random = class {
    seed;
    constructor(seed) {
      if (typeof seed === "undefined") {
        this.seed = new Date().getTime();
      } else {
        this.seed = seed;
      }
    }
    next() {
      const x = Math.sin(this.seed++) * 1e4;
      return x - Math.floor(x);
    }
  };

  // scripts/colorreductionmanagement.js
  var ColorMapResult = class {
    imgColorIndices;
    colorsByIndex;
    width;
    height;
  };
  var ColorReducer = class {
    static createColorMap(kmeansImgData) {
      const imgColorIndices = new Uint8Array2D(kmeansImgData.width, kmeansImgData.height);
      let colorIndex = 0;
      const colors = {};
      const colorsByIndex = [];
      let idx = 0;
      for (let j = 0; j < kmeansImgData.height; j++) {
        for (let i = 0; i < kmeansImgData.width; i++) {
          const r = kmeansImgData.data[idx++];
          const g = kmeansImgData.data[idx++];
          const b = kmeansImgData.data[idx++];
          const a = kmeansImgData.data[idx++];
          let currentColorIndex;
          const color = r + "," + g + "," + b;
          if (typeof colors[color] === "undefined") {
            currentColorIndex = colorIndex;
            colors[color] = colorIndex;
            colorsByIndex.push([r, g, b]);
            colorIndex++;
          } else {
            currentColorIndex = colors[color];
          }
          imgColorIndices.set(i, j, currentColorIndex);
        }
      }
      const result = new ColorMapResult();
      result.imgColorIndices = imgColorIndices;
      result.colorsByIndex = colorsByIndex;
      result.width = kmeansImgData.width;
      result.height = kmeansImgData.height;
      return result;
    }
    static async applyKMeansClustering(imgData, outputImgData, ctx, settings, onUpdate = null) {
      const vectors = [];
      let idx = 0;
      let vIdx = 0;
      const bitsToChopOff = 2;
      const pointsByColor = {};
      for (let j = 0; j < imgData.height; j++) {
        for (let i = 0; i < imgData.width; i++) {
          let r = imgData.data[idx++];
          let g = imgData.data[idx++];
          let b = imgData.data[idx++];
          const a = imgData.data[idx++];
          r = r >> bitsToChopOff << bitsToChopOff;
          g = g >> bitsToChopOff << bitsToChopOff;
          b = b >> bitsToChopOff << bitsToChopOff;
          const color = `${r},${g},${b}`;
          if (!(color in pointsByColor)) {
            pointsByColor[color] = [j * imgData.width + i];
          } else {
            pointsByColor[color].push(j * imgData.width + i);
          }
        }
      }
      for (const color of Object.keys(pointsByColor)) {
        const rgb = color.split(",").map((v) => parseInt(v));
        let data;
        if (settings.kMeansClusteringColorSpace === ClusteringColorSpace.RGB) {
          data = rgb;
        } else if (settings.kMeansClusteringColorSpace === ClusteringColorSpace.HSL) {
          data = rgbToHsl(rgb[0], rgb[1], rgb[2]);
        } else if (settings.kMeansClusteringColorSpace === ClusteringColorSpace.LAB) {
          data = rgb2lab(rgb);
        } else {
          data = rgb;
        }
        const weight = pointsByColor[color].length / (imgData.width * imgData.height);
        const vec = new Vector(data, weight);
        vec.tag = rgb;
        vectors[vIdx++] = vec;
      }
      const random = new Random(settings.randomSeed === 0 ? new Date().getTime() : settings.randomSeed);
      const kmeans = new KMeans(vectors, settings.kMeansNrOfClusters, random);
      let curTime = new Date().getTime();
      kmeans.step();
      while (kmeans.currentDeltaDistanceDifference > settings.kMeansMinDeltaDifference) {
        kmeans.step();
        if (new Date().getTime() - curTime > 500) {
          curTime = new Date().getTime();
          await delay(0);
          if (onUpdate != null) {
            ColorReducer.updateKmeansOutputImageData(kmeans, settings, pointsByColor, imgData, outputImgData, false);
            onUpdate(kmeans);
          }
        }
      }
      ColorReducer.updateKmeansOutputImageData(kmeans, settings, pointsByColor, imgData, outputImgData, true);
      if (onUpdate != null) {
        onUpdate(kmeans);
      }
    }
    static updateKmeansOutputImageData(kmeans, settings, pointsByColor, imgData, outputImgData, restrictToSpecifiedColors) {
      for (let c = 0; c < kmeans.centroids.length; c++) {
        const centroid = kmeans.centroids[c];
        for (const v of kmeans.pointsPerCategory[c]) {
          let rgb;
          if (settings.kMeansClusteringColorSpace === ClusteringColorSpace.RGB) {
            rgb = centroid.values;
          } else if (settings.kMeansClusteringColorSpace === ClusteringColorSpace.HSL) {
            const hsl = centroid.values;
            rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
          } else if (settings.kMeansClusteringColorSpace === ClusteringColorSpace.LAB) {
            const lab = centroid.values;
            rgb = lab2rgb(lab);
          } else {
            rgb = centroid.values;
          }
          rgb = rgb.map((v2) => Math.floor(v2));
          if (restrictToSpecifiedColors) {
            if (settings.kMeansColorRestrictions.length > 0) {
              let minDistance = Number.MAX_VALUE;
              let closestRestrictedColor = null;
              for (const color of settings.kMeansColorRestrictions) {
                const centroidLab = rgb2lab(rgb);
                let restrictionLab;
                if (typeof color === "string") {
                  restrictionLab = rgb2lab(settings.colorAliases[color]);
                } else {
                  restrictionLab = rgb2lab(color);
                }
                const distance = Math.sqrt((centroidLab[0] - restrictionLab[0]) * (centroidLab[0] - restrictionLab[0]) + (centroidLab[1] - restrictionLab[1]) * (centroidLab[1] - restrictionLab[1]) + (centroidLab[2] - restrictionLab[2]) * (centroidLab[2] - restrictionLab[2]));
                if (distance < minDistance) {
                  minDistance = distance;
                  closestRestrictedColor = color;
                }
              }
              if (closestRestrictedColor !== null) {
                if (typeof closestRestrictedColor === "string") {
                  rgb = settings.colorAliases[closestRestrictedColor];
                } else {
                  rgb = closestRestrictedColor;
                }
              }
            }
          }
          let pointRGB = v.tag;
          const pointColor = `${Math.floor(pointRGB[0])},${Math.floor(pointRGB[1])},${Math.floor(pointRGB[2])}`;
          for (const pt of pointsByColor[pointColor]) {
            const ptx = pt % imgData.width;
            const pty = Math.floor(pt / imgData.width);
            let dataOffset = (pty * imgData.width + ptx) * 4;
            outputImgData.data[dataOffset++] = rgb[0];
            outputImgData.data[dataOffset++] = rgb[1];
            outputImgData.data[dataOffset++] = rgb[2];
          }
        }
      }
    }
    static buildColorDistanceMatrix(colorsByIndex) {
      const colorDistances = new Array(colorsByIndex.length);
      for (let j = 0; j < colorsByIndex.length; j++) {
        colorDistances[j] = new Array(colorDistances.length);
      }
      for (let j = 0; j < colorsByIndex.length; j++) {
        for (let i = j; i < colorsByIndex.length; i++) {
          const c1 = colorsByIndex[j];
          const c2 = colorsByIndex[i];
          const distance = Math.sqrt((c1[0] - c2[0]) * (c1[0] - c2[0]) + (c1[1] - c2[1]) * (c1[1] - c2[1]) + (c1[2] - c2[2]) * (c1[2] - c2[2]));
          colorDistances[i][j] = distance;
          colorDistances[j][i] = distance;
        }
      }
      return colorDistances;
    }
    static async processNarrowPixelStripCleanup(colormapResult) {
      const colorDistances = ColorReducer.buildColorDistanceMatrix(colormapResult.colorsByIndex);
      let count = 0;
      const imgColorIndices = colormapResult.imgColorIndices;
      for (let j = 1; j < colormapResult.height - 1; j++) {
        for (let i = 1; i < colormapResult.width - 1; i++) {
          const top = imgColorIndices.get(i, j - 1);
          const bottom = imgColorIndices.get(i, j + 1);
          const left = imgColorIndices.get(i - 1, j);
          const right = imgColorIndices.get(i + 1, j);
          const cur = imgColorIndices.get(i, j);
          if (cur !== top && cur !== bottom && cur !== left && cur !== right) {
          } else if (cur !== top && cur !== bottom) {
            const topColorDistance = colorDistances[cur][top];
            const bottomColorDistance = colorDistances[cur][bottom];
            imgColorIndices.set(i, j, topColorDistance < bottomColorDistance ? top : bottom);
            count++;
          } else if (cur !== left && cur !== right) {
            const leftColorDistance = colorDistances[cur][left];
            const rightColorDistance = colorDistances[cur][right];
            imgColorIndices.set(i, j, leftColorDistance < rightColorDistance ? left : right);
            count++;
          }
        }
      }
      console.log(count + " pixels replaced to remove narrow pixel strips");
    }
  };

  // scripts/structs/point.js
  var Point = class {
    x;
    y;
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
    distanceTo(pt) {
      return Math.abs(pt.x - this.x) + Math.abs(pt.y - this.y);
    }
    distanceToCoord(x, y) {
      return Math.abs(x - this.x) + Math.abs(y - this.y);
    }
  };

  // scripts/facetmanagement.js
  var OrientationEnum;
  (function(OrientationEnum2) {
    OrientationEnum2[OrientationEnum2["Left"] = 0] = "Left";
    OrientationEnum2[OrientationEnum2["Top"] = 1] = "Top";
    OrientationEnum2[OrientationEnum2["Right"] = 2] = "Right";
    OrientationEnum2[OrientationEnum2["Bottom"] = 3] = "Bottom";
  })(OrientationEnum || (OrientationEnum = {}));
  var PathPoint = class extends Point {
    orientation;
    constructor(pt, orientation) {
      super(pt.x, pt.y);
      this.orientation = orientation;
    }
    getWallX() {
      let x = this.x;
      if (this.orientation === OrientationEnum.Left) {
        x -= 0.5;
      } else if (this.orientation === OrientationEnum.Right) {
        x += 0.5;
      }
      return x;
    }
    getWallY() {
      let y = this.y;
      if (this.orientation === OrientationEnum.Top) {
        y -= 0.5;
      } else if (this.orientation === OrientationEnum.Bottom) {
        y += 0.5;
      }
      return y;
    }
    getNeighbour(facetResult) {
      switch (this.orientation) {
        case OrientationEnum.Left:
          if (this.x - 1 >= 0) {
            return facetResult.facetMap.get(this.x - 1, this.y);
          }
          break;
        case OrientationEnum.Right:
          if (this.x + 1 < facetResult.width) {
            return facetResult.facetMap.get(this.x + 1, this.y);
          }
          break;
        case OrientationEnum.Top:
          if (this.y - 1 >= 0) {
            return facetResult.facetMap.get(this.x, this.y - 1);
          }
          break;
        case OrientationEnum.Bottom:
          if (this.y + 1 < facetResult.height) {
            return facetResult.facetMap.get(this.x, this.y + 1);
          }
          break;
      }
      return -1;
    }
    toString() {
      return this.x + "," + this.y + " " + this.orientation;
    }
  };
  var Facet = class {
    id;
    color;
    pointCount = 0;
    borderPoints;
    neighbourFacets;
    neighbourFacetsIsDirty = false;
    bbox;
    borderPath;
    borderSegments;
    labelBounds;
    getFullPathFromBorderSegments(useWalls) {
      const newpath = [];
      const addPoint = (pt) => {
        if (useWalls) {
          newpath.push(new Point(pt.getWallX(), pt.getWallY()));
        } else {
          newpath.push(new Point(pt.x, pt.y));
        }
      };
      let lastSegment = null;
      for (const seg of this.borderSegments) {
        if (lastSegment != null) {
          if (lastSegment.reverseOrder) {
            addPoint(lastSegment.originalSegment.points[0]);
          } else {
            addPoint(lastSegment.originalSegment.points[lastSegment.originalSegment.points.length - 1]);
          }
        }
        for (let i = 0; i < seg.originalSegment.points.length; i++) {
          const idx = seg.reverseOrder ? seg.originalSegment.points.length - 1 - i : i;
          addPoint(seg.originalSegment.points[idx]);
        }
        lastSegment = seg;
      }
      return newpath;
    }
  };
  var FacetResult = class {
    facetMap;
    facets;
    width;
    height;
  };

  // scripts/facetBorderSegmenter.js
  var PathSegment = class {
    points;
    neighbour;
    constructor(points, neighbour) {
      this.points = points;
      this.neighbour = neighbour;
    }
  };
  var FacetBoundarySegment = class {
    originalSegment;
    neighbour;
    reverseOrder;
    constructor(originalSegment, neighbour, reverseOrder) {
      this.originalSegment = originalSegment;
      this.neighbour = neighbour;
      this.reverseOrder = reverseOrder;
    }
  };
  var FacetBorderSegmenter = class {
    static async buildFacetBorderSegments(facetResult, nrOfTimesToHalvePoints = 2, onUpdate = null) {
      const segmentsPerFacet = FacetBorderSegmenter.prepareSegmentsPerFacet(facetResult);
      FacetBorderSegmenter.reduceSegmentComplexity(facetResult, segmentsPerFacet, nrOfTimesToHalvePoints);
      await FacetBorderSegmenter.matchSegmentsWithNeighbours(facetResult, segmentsPerFacet, onUpdate);
    }
    static prepareSegmentsPerFacet(facetResult) {
      const segmentsPerFacet = new Array(facetResult.facets.length);
      for (const f of facetResult.facets) {
        if (f != null) {
          const segments = [];
          if (f.borderPath.length > 1) {
            let currentPoints = [];
            currentPoints.push(f.borderPath[0]);
            for (let i = 1; i < f.borderPath.length; i++) {
              const prevBorderPoint = f.borderPath[i - 1];
              const curBorderPoint = f.borderPath[i];
              const oldNeighbour = prevBorderPoint.getNeighbour(facetResult);
              const curNeighbour = curBorderPoint.getNeighbour(facetResult);
              let isTransitionPoint = false;
              if (oldNeighbour !== curNeighbour) {
                isTransitionPoint = true;
              } else {
                if (oldNeighbour !== -1) {
                  if (prevBorderPoint.x === curBorderPoint.x && prevBorderPoint.y === curBorderPoint.y) {
                    if (prevBorderPoint.orientation === OrientationEnum.Top && curBorderPoint.orientation === OrientationEnum.Left || prevBorderPoint.orientation === OrientationEnum.Left && curBorderPoint.orientation === OrientationEnum.Top) {
                      const diagNeighbour = facetResult.facetMap.get(curBorderPoint.x - 1, curBorderPoint.y - 1);
                      if (diagNeighbour !== oldNeighbour) {
                        isTransitionPoint = true;
                      }
                    } else if (prevBorderPoint.orientation === OrientationEnum.Top && curBorderPoint.orientation === OrientationEnum.Right || prevBorderPoint.orientation === OrientationEnum.Right && curBorderPoint.orientation === OrientationEnum.Top) {
                      const diagNeighbour = facetResult.facetMap.get(curBorderPoint.x + 1, curBorderPoint.y - 1);
                      if (diagNeighbour !== oldNeighbour) {
                        isTransitionPoint = true;
                      }
                    } else if (prevBorderPoint.orientation === OrientationEnum.Bottom && curBorderPoint.orientation === OrientationEnum.Left || prevBorderPoint.orientation === OrientationEnum.Left && curBorderPoint.orientation === OrientationEnum.Bottom) {
                      const diagNeighbour = facetResult.facetMap.get(curBorderPoint.x - 1, curBorderPoint.y + 1);
                      if (diagNeighbour !== oldNeighbour) {
                        isTransitionPoint = true;
                      }
                    } else if (prevBorderPoint.orientation === OrientationEnum.Bottom && curBorderPoint.orientation === OrientationEnum.Right || prevBorderPoint.orientation === OrientationEnum.Right && curBorderPoint.orientation === OrientationEnum.Bottom) {
                      const diagNeighbour = facetResult.facetMap.get(curBorderPoint.x + 1, curBorderPoint.y + 1);
                      if (diagNeighbour !== oldNeighbour) {
                        isTransitionPoint = true;
                      }
                    }
                  }
                }
              }
              currentPoints.push(curBorderPoint);
              if (isTransitionPoint) {
                if (currentPoints.length > 1) {
                  const segment = new PathSegment(currentPoints, oldNeighbour);
                  segments.push(segment);
                  currentPoints = [curBorderPoint];
                }
              }
            }
            if (currentPoints.length > 1) {
              const oldNeighbour = f.borderPath[f.borderPath.length - 1].getNeighbour(facetResult);
              if (segments.length > 0 && segments[0].neighbour === oldNeighbour) {
                const mergedPoints = currentPoints.concat(segments[0].points);
                segments[0].points = mergedPoints;
              } else {
                const segment = new PathSegment(currentPoints, oldNeighbour);
                segments.push(segment);
                currentPoints = [];
              }
            }
          }
          segmentsPerFacet[f.id] = segments;
        }
      }
      return segmentsPerFacet;
    }
    static reduceSegmentComplexity(facetResult, segmentsPerFacet, nrOfTimesToHalvePoints) {
      for (const f of facetResult.facets) {
        if (f != null) {
          for (const segment of segmentsPerFacet[f.id]) {
            for (let i = 0; i < nrOfTimesToHalvePoints; i++) {
              segment.points = FacetBorderSegmenter.reduceSegmentHaarWavelet(segment.points, true, facetResult.width, facetResult.height);
            }
          }
        }
      }
    }
    static reduceSegmentHaarWavelet(newpath, skipOutsideBorders, width, height) {
      if (newpath.length <= 5) {
        return newpath;
      }
      const reducedPath = [];
      reducedPath.push(newpath[0]);
      for (let i = 1; i < newpath.length - 2; i += 2) {
        if (!skipOutsideBorders || skipOutsideBorders && !FacetBorderSegmenter.isOutsideBorderPoint(newpath[i], width, height)) {
          const cx = (newpath[i].x + newpath[i + 1].x) / 2;
          const cy = (newpath[i].y + newpath[i + 1].y) / 2;
          reducedPath.push(new PathPoint(new Point(cx, cy), OrientationEnum.Left));
        } else {
          reducedPath.push(newpath[i]);
          reducedPath.push(newpath[i + 1]);
        }
      }
      reducedPath.push(newpath[newpath.length - 1]);
      return reducedPath;
    }
    static isOutsideBorderPoint(point, width, height) {
      return point.x === 0 || point.y === 0 || point.x === width - 1 || point.y === height - 1;
    }
    static calculateArea(path) {
      let total = 0;
      for (let i = 0; i < path.length; i++) {
        const addX = path[i].x;
        const addY = path[i === path.length - 1 ? 0 : i + 1].y;
        const subX = path[i === path.length - 1 ? 0 : i + 1].x;
        const subY = path[i].y;
        total += addX * addY * 0.5;
        total -= subX * subY * 0.5;
      }
      return Math.abs(total);
    }
    static async matchSegmentsWithNeighbours(facetResult, segmentsPerFacet, onUpdate = null) {
      const MAX_DISTANCE = 4;
      for (const f of facetResult.facets) {
        if (f != null) {
          f.borderSegments = new Array(segmentsPerFacet[f.id].length);
        }
      }
      let count = 0;
      for (const f of facetResult.facets) {
        if (f != null) {
          const debug = false;
          for (let s = 0; s < segmentsPerFacet[f.id].length; s++) {
            const segment = segmentsPerFacet[f.id][s];
            if (segment != null && f.borderSegments[s] == null) {
              f.borderSegments[s] = new FacetBoundarySegment(segment, segment.neighbour, false);
              if (debug) {
                console.log("Setting facet " + f.id + " segment " + s + " to " + f.borderSegments[s]);
              }
              if (segment.neighbour !== -1) {
                const neighbourFacet = facetResult.facets[segment.neighbour];
                let matchFound = false;
                if (neighbourFacet != null) {
                  const neighbourSegments = segmentsPerFacet[segment.neighbour];
                  for (let ns = 0; ns < neighbourSegments.length; ns++) {
                    const neighbourSegment = neighbourSegments[ns];
                    if (neighbourSegment != null && neighbourSegment.neighbour === f.id) {
                      const segStartPoint = segment.points[0];
                      const segEndPoint = segment.points[segment.points.length - 1];
                      const nSegStartPoint = neighbourSegment.points[0];
                      const nSegEndPoint = neighbourSegment.points[neighbourSegment.points.length - 1];
                      let matchesStraight = segStartPoint.distanceTo(nSegStartPoint) <= MAX_DISTANCE && segEndPoint.distanceTo(nSegEndPoint) <= MAX_DISTANCE;
                      let matchesReverse = segStartPoint.distanceTo(nSegEndPoint) <= MAX_DISTANCE && segEndPoint.distanceTo(nSegStartPoint) <= MAX_DISTANCE;
                      if (matchesStraight && matchesReverse) {
                        if (segStartPoint.distanceTo(nSegStartPoint) + segEndPoint.distanceTo(nSegEndPoint) < segStartPoint.distanceTo(nSegEndPoint) + segEndPoint.distanceTo(nSegStartPoint)) {
                          matchesStraight = true;
                          matchesReverse = false;
                        } else {
                          matchesStraight = false;
                          matchesReverse = true;
                        }
                      }
                      if (matchesStraight) {
                        if (debug) {
                          console.log("Match found for facet " + f.id + " to neighbour " + neighbourFacet.id);
                        }
                        neighbourFacet.borderSegments[ns] = new FacetBoundarySegment(segment, f.id, false);
                        if (debug) {
                          console.log("Setting facet " + neighbourFacet.id + " segment " + ns + " to " + neighbourFacet.borderSegments[ns]);
                        }
                        segmentsPerFacet[neighbourFacet.id][ns] = null;
                        matchFound = true;
                        break;
                      } else if (matchesReverse) {
                        if (debug) {
                          console.log("Reverse match found for facet " + f.id + " to neighbour " + neighbourFacet.id);
                        }
                        neighbourFacet.borderSegments[ns] = new FacetBoundarySegment(segment, f.id, true);
                        if (debug) {
                          console.log("Setting facet " + neighbourFacet.id + " segment " + ns + " to " + neighbourFacet.borderSegments[ns]);
                        }
                        segmentsPerFacet[neighbourFacet.id][ns] = null;
                        matchFound = true;
                        break;
                      }
                    }
                  }
                }
                if (!matchFound && debug) {
                  console.error("No match found for segment of " + f.id + ": " + ("siding " + segment.neighbour + " " + segment.points[0] + " -> " + segment.points[segment.points.length - 1]));
                }
              }
            }
            segmentsPerFacet[f.id][s] = null;
          }
          if (count % 100 === 0) {
            await delay(0);
            if (onUpdate != null) {
              onUpdate(f.id / facetResult.facets.length);
            }
          }
        }
        count++;
      }
      if (onUpdate != null) {
        onUpdate(1);
      }
    }
  };

  // scripts/facetBorderTracer.js
  var FacetBorderTracer = class {
    static async buildFacetBorderPaths(facetResult, onUpdate = null) {
      let count = 0;
      const borderMask = new BooleanArray2D(facetResult.width, facetResult.height);
      const facetProcessingOrder = facetResult.facets.filter((f) => f != null).slice(0).sort((a, b) => b.pointCount > a.pointCount ? 1 : b.pointCount < a.pointCount ? -1 : 0).map((f) => f.id);
      for (let fidx = 0; fidx < facetProcessingOrder.length; fidx++) {
        const f = facetResult.facets[facetProcessingOrder[fidx]];
        if (f != null) {
          for (const bp of f.borderPoints) {
            borderMask.set(bp.x, bp.y, true);
          }
          const xWall = new BooleanArray2D(facetResult.width + 1, facetResult.height + 1);
          const yWall = new BooleanArray2D(facetResult.width + 1, facetResult.height + 1);
          let borderStartIndex = -1;
          for (let i = 0; i < f.borderPoints.length; i++) {
            if (f.borderPoints[i].x === f.bbox.minX || f.borderPoints[i].x === f.bbox.maxX || (f.borderPoints[i].y === f.bbox.minY || f.borderPoints[i].y === f.bbox.maxY)) {
              borderStartIndex = i;
              break;
            }
          }
          const pt = new PathPoint(f.borderPoints[borderStartIndex], OrientationEnum.Left);
          if (pt.x - 1 < 0 || facetResult.facetMap.get(pt.x - 1, pt.y) !== f.id) {
            pt.orientation = OrientationEnum.Left;
          } else if (pt.y - 1 < 0 || facetResult.facetMap.get(pt.x, pt.y - 1) !== f.id) {
            pt.orientation = OrientationEnum.Top;
          } else if (pt.x + 1 >= facetResult.width || facetResult.facetMap.get(pt.x + 1, pt.y) !== f.id) {
            pt.orientation = OrientationEnum.Right;
          } else if (pt.y + 1 >= facetResult.height || facetResult.facetMap.get(pt.x, pt.y + 1) !== f.id) {
            pt.orientation = OrientationEnum.Bottom;
          }
          const path = FacetBorderTracer.getPath(pt, facetResult, f, borderMask, xWall, yWall);
          f.borderPath = path;
          if (count % 100 === 0) {
            await delay(0);
            if (onUpdate != null) {
              onUpdate(fidx / facetProcessingOrder.length);
            }
          }
        }
        count++;
      }
      if (onUpdate != null) {
        onUpdate(1);
      }
    }
    static getPath(pt, facetResult, f, borderMask, xWall, yWall) {
      const debug = false;
      let finished = false;
      const count = 0;
      const path = [];
      FacetBorderTracer.addPointToPath(path, pt, xWall, f, yWall);
      while (!finished) {
        if (debug) {
          console.log(pt.x + " " + pt.y + " " + pt.orientation);
        }
        const possibleNextPoints = [];
        if (pt.orientation === OrientationEnum.Left) {
          if ((pt.y - 1 >= 0 && facetResult.facetMap.get(pt.x, pt.y - 1) !== f.id || pt.y - 1 < 0) && !yWall.get(pt.x, pt.y)) {
            if (debug) {
              console.log("can place top _ wall at x,y");
            }
            const nextpt = new PathPoint(new Point(pt.x, pt.y), OrientationEnum.Top);
            possibleNextPoints.push(nextpt);
          }
          if ((pt.y + 1 < facetResult.height && facetResult.facetMap.get(pt.x, pt.y + 1) !== f.id || pt.y + 1 >= facetResult.height) && !yWall.get(pt.x, pt.y + 1)) {
            if (debug) {
              console.log("can place bottom _ wall at x,y");
            }
            const nextpt = new PathPoint(new Point(pt.x, pt.y), OrientationEnum.Bottom);
            possibleNextPoints.push(nextpt);
          }
          if (pt.y - 1 >= 0 && facetResult.facetMap.get(pt.x, pt.y - 1) === f.id && (pt.x - 1 < 0 || facetResult.facetMap.get(pt.x - 1, pt.y - 1) !== f.id) && borderMask.get(pt.x, pt.y - 1) && !xWall.get(pt.x, pt.y - 1)) {
            if (debug) {
              console.log(`can place left | wall at x,y-1`);
            }
            const nextpt = new PathPoint(new Point(pt.x, pt.y - 1), OrientationEnum.Left);
            possibleNextPoints.push(nextpt);
          }
          if (pt.y + 1 < facetResult.height && facetResult.facetMap.get(pt.x, pt.y + 1) === f.id && (pt.x - 1 < 0 || facetResult.facetMap.get(pt.x - 1, pt.y + 1) !== f.id) && borderMask.get(pt.x, pt.y + 1) && !xWall.get(pt.x, pt.y + 1)) {
            if (debug) {
              console.log("can place left | wall at x,y+1");
            }
            const nextpt = new PathPoint(new Point(pt.x, pt.y + 1), OrientationEnum.Left);
            possibleNextPoints.push(nextpt);
          }
          if (pt.y - 1 >= 0 && pt.x - 1 >= 0 && facetResult.facetMap.get(pt.x - 1, pt.y - 1) === f.id && borderMask.get(pt.x - 1, pt.y - 1) && !yWall.get(pt.x - 1, pt.y - 1 + 1) && !yWall.get(pt.x, pt.y)) {
            if (debug) {
              console.log("can place bottom _ wall at x-1,y-1");
            }
            const nextpt = new PathPoint(new Point(pt.x - 1, pt.y - 1), OrientationEnum.Bottom);
            possibleNextPoints.push(nextpt);
          }
          if (pt.y + 1 < facetResult.height && pt.x - 1 >= 0 && facetResult.facetMap.get(pt.x - 1, pt.y + 1) === f.id && borderMask.get(pt.x - 1, pt.y + 1) && !yWall.get(pt.x - 1, pt.y + 1) && !yWall.get(pt.x, pt.y + 1)) {
            if (debug) {
              console.log("can place top _ wall at x-1,y+1");
            }
            const nextpt = new PathPoint(new Point(pt.x - 1, pt.y + 1), OrientationEnum.Top);
            possibleNextPoints.push(nextpt);
          }
        } else if (pt.orientation === OrientationEnum.Top) {
          if ((pt.x - 1 >= 0 && facetResult.facetMap.get(pt.x - 1, pt.y) !== f.id || pt.x - 1 < 0) && !xWall.get(pt.x, pt.y)) {
            if (debug) {
              console.log("can place left | wall at x,y");
            }
            const nextpt = new PathPoint(new Point(pt.x, pt.y), OrientationEnum.Left);
            possibleNextPoints.push(nextpt);
          }
          if ((pt.x + 1 < facetResult.width && facetResult.facetMap.get(pt.x + 1, pt.y) !== f.id || pt.x + 1 >= facetResult.width) && !xWall.get(pt.x + 1, pt.y)) {
            if (debug) {
              console.log("can place right | wall at x,y");
            }
            const nextpt = new PathPoint(new Point(pt.x, pt.y), OrientationEnum.Right);
            possibleNextPoints.push(nextpt);
          }
          if (pt.x - 1 >= 0 && facetResult.facetMap.get(pt.x - 1, pt.y) === f.id && (pt.y - 1 < 0 || facetResult.facetMap.get(pt.x - 1, pt.y - 1) !== f.id) && borderMask.get(pt.x - 1, pt.y) && !yWall.get(pt.x - 1, pt.y)) {
            if (debug) {
              console.log(`can place top _ wall at x-1,y`);
            }
            const nextpt = new PathPoint(new Point(pt.x - 1, pt.y), OrientationEnum.Top);
            possibleNextPoints.push(nextpt);
          }
          if (pt.x + 1 < facetResult.width && facetResult.facetMap.get(pt.x + 1, pt.y) === f.id && (pt.y - 1 < 0 || facetResult.facetMap.get(pt.x + 1, pt.y - 1) !== f.id) && borderMask.get(pt.x + 1, pt.y) && !yWall.get(pt.x + 1, pt.y)) {
            if (debug) {
              console.log(`can place top _ wall at x+1,y`);
            }
            const nextpt = new PathPoint(new Point(pt.x + 1, pt.y), OrientationEnum.Top);
            possibleNextPoints.push(nextpt);
          }
          if (pt.y - 1 >= 0 && pt.x - 1 >= 0 && facetResult.facetMap.get(pt.x - 1, pt.y - 1) === f.id && borderMask.get(pt.x - 1, pt.y - 1) && !xWall.get(pt.x - 1 + 1, pt.y - 1) && !xWall.get(pt.x, pt.y)) {
            if (debug) {
              console.log("can place right | wall at x-1,y-1");
            }
            const nextpt = new PathPoint(new Point(pt.x - 1, pt.y - 1), OrientationEnum.Right);
            possibleNextPoints.push(nextpt);
          }
          if (pt.y - 1 >= 0 && pt.x + 1 < facetResult.width && facetResult.facetMap.get(pt.x + 1, pt.y - 1) === f.id && borderMask.get(pt.x + 1, pt.y - 1) && !xWall.get(pt.x + 1, pt.y - 1) && !xWall.get(pt.x + 1, pt.y)) {
            if (debug) {
              console.log("can place left |  wall at x+1,y-1");
            }
            const nextpt = new PathPoint(new Point(pt.x + 1, pt.y - 1), OrientationEnum.Left);
            possibleNextPoints.push(nextpt);
          }
        } else if (pt.orientation === OrientationEnum.Right) {
          if ((pt.y - 1 >= 0 && facetResult.facetMap.get(pt.x, pt.y - 1) !== f.id || pt.y - 1 < 0) && !yWall.get(pt.x, pt.y)) {
            if (debug) {
              console.log("can place top _ wall at x,y");
            }
            const nextpt = new PathPoint(new Point(pt.x, pt.y), OrientationEnum.Top);
            possibleNextPoints.push(nextpt);
          }
          if ((pt.y + 1 < facetResult.height && facetResult.facetMap.get(pt.x, pt.y + 1) !== f.id || pt.y + 1 >= facetResult.height) && !yWall.get(pt.x, pt.y + 1)) {
            if (debug) {
              console.log("can place bottom _ wall at x,y");
            }
            const nextpt = new PathPoint(new Point(pt.x, pt.y), OrientationEnum.Bottom);
            possibleNextPoints.push(nextpt);
          }
          if (pt.y - 1 >= 0 && facetResult.facetMap.get(pt.x, pt.y - 1) === f.id && (pt.x + 1 >= facetResult.width || facetResult.facetMap.get(pt.x + 1, pt.y - 1) !== f.id) && borderMask.get(pt.x, pt.y - 1) && !xWall.get(pt.x + 1, pt.y - 1)) {
            if (debug) {
              console.log(`can place right | wall at x,y-1`);
            }
            const nextpt = new PathPoint(new Point(pt.x, pt.y - 1), OrientationEnum.Right);
            possibleNextPoints.push(nextpt);
          }
          if (pt.y + 1 < facetResult.height && facetResult.facetMap.get(pt.x, pt.y + 1) === f.id && (pt.x + 1 >= facetResult.width || facetResult.facetMap.get(pt.x + 1, pt.y + 1) !== f.id) && borderMask.get(pt.x, pt.y + 1) && !xWall.get(pt.x + 1, pt.y + 1)) {
            if (debug) {
              console.log("can place right | wall at x,y+1");
            }
            const nextpt = new PathPoint(new Point(pt.x, pt.y + 1), OrientationEnum.Right);
            possibleNextPoints.push(nextpt);
          }
          if (pt.y - 1 >= 0 && pt.x + 1 < facetResult.width && facetResult.facetMap.get(pt.x + 1, pt.y - 1) === f.id && borderMask.get(pt.x + 1, pt.y - 1) && !yWall.get(pt.x + 1, pt.y - 1 + 1) && !yWall.get(pt.x, pt.y)) {
            if (debug) {
              console.log("can place bottom _ wall at x+1,y-1");
            }
            const nextpt = new PathPoint(new Point(pt.x + 1, pt.y - 1), OrientationEnum.Bottom);
            possibleNextPoints.push(nextpt);
          }
          if (pt.y + 1 < facetResult.height && pt.x + 1 < facetResult.width && facetResult.facetMap.get(pt.x + 1, pt.y + 1) === f.id && borderMask.get(pt.x + 1, pt.y + 1) && !yWall.get(pt.x + 1, pt.y + 1) && !yWall.get(pt.x, pt.y + 1)) {
            if (debug) {
              console.log("can place top _ wall at x+1,y+1");
            }
            const nextpt = new PathPoint(new Point(pt.x + 1, pt.y + 1), OrientationEnum.Top);
            possibleNextPoints.push(nextpt);
          }
        } else if (pt.orientation === OrientationEnum.Bottom) {
          if ((pt.x - 1 >= 0 && facetResult.facetMap.get(pt.x - 1, pt.y) !== f.id || pt.x - 1 < 0) && !xWall.get(pt.x, pt.y)) {
            if (debug) {
              console.log("can place left | wall at x,y");
            }
            const nextpt = new PathPoint(new Point(pt.x, pt.y), OrientationEnum.Left);
            possibleNextPoints.push(nextpt);
          }
          if ((pt.x + 1 < facetResult.width && facetResult.facetMap.get(pt.x + 1, pt.y) !== f.id || pt.x + 1 >= facetResult.width) && !xWall.get(pt.x + 1, pt.y)) {
            if (debug) {
              console.log("can place right | wall at x,y");
            }
            const nextpt = new PathPoint(new Point(pt.x, pt.y), OrientationEnum.Right);
            possibleNextPoints.push(nextpt);
          }
          if (pt.x - 1 >= 0 && facetResult.facetMap.get(pt.x - 1, pt.y) === f.id && (pt.y + 1 >= facetResult.height || facetResult.facetMap.get(pt.x - 1, pt.y + 1) !== f.id) && borderMask.get(pt.x - 1, pt.y) && !yWall.get(pt.x - 1, pt.y + 1)) {
            if (debug) {
              console.log(`can place bottom _ wall at x-1,y`);
            }
            const nextpt = new PathPoint(new Point(pt.x - 1, pt.y), OrientationEnum.Bottom);
            possibleNextPoints.push(nextpt);
          }
          if (pt.x + 1 < facetResult.width && facetResult.facetMap.get(pt.x + 1, pt.y) === f.id && (pt.y + 1 >= facetResult.height || facetResult.facetMap.get(pt.x + 1, pt.y + 1) !== f.id) && borderMask.get(pt.x + 1, pt.y) && !yWall.get(pt.x + 1, pt.y + 1)) {
            if (debug) {
              console.log(`can place bottom _ wall at x+1,y`);
            }
            const nextpt = new PathPoint(new Point(pt.x + 1, pt.y), OrientationEnum.Bottom);
            possibleNextPoints.push(nextpt);
          }
          if (pt.y + 1 < facetResult.height && pt.x - 1 >= 0 && facetResult.facetMap.get(pt.x - 1, pt.y + 1) === f.id && borderMask.get(pt.x - 1, pt.y + 1) && !xWall.get(pt.x - 1 + 1, pt.y + 1) && !xWall.get(pt.x, pt.y)) {
            if (debug) {
              console.log("can place right | wall at x-1,y+1");
            }
            const nextpt = new PathPoint(new Point(pt.x - 1, pt.y + 1), OrientationEnum.Right);
            possibleNextPoints.push(nextpt);
          }
          if (pt.y + 1 < facetResult.height && pt.x + 1 < facetResult.width && facetResult.facetMap.get(pt.x + 1, pt.y + 1) === f.id && borderMask.get(pt.x + 1, pt.y + 1) && !xWall.get(pt.x + 1, pt.y + 1) && !xWall.get(pt.x + 1, pt.y)) {
            if (debug) {
              console.log("can place left |  wall at x+1,y+1");
            }
            const nextpt = new PathPoint(new Point(pt.x + 1, pt.y + 1), OrientationEnum.Left);
            possibleNextPoints.push(nextpt);
          }
        }
        if (possibleNextPoints.length > 1) {
          pt = possibleNextPoints[0];
          FacetBorderTracer.addPointToPath(path, pt, xWall, f, yWall);
        } else if (possibleNextPoints.length === 1) {
          pt = possibleNextPoints[0];
          FacetBorderTracer.addPointToPath(path, pt, xWall, f, yWall);
        } else {
          finished = true;
        }
      }
      for (const pathPoint of path) {
        switch (pathPoint.orientation) {
          case OrientationEnum.Left:
            xWall.set(pathPoint.x, pathPoint.y, false);
            break;
          case OrientationEnum.Top:
            yWall.set(pathPoint.x, pathPoint.y, false);
            break;
          case OrientationEnum.Right:
            xWall.set(pathPoint.x + 1, pathPoint.y, false);
            break;
          case OrientationEnum.Bottom:
            yWall.set(pathPoint.x, pathPoint.y + 1, false);
            break;
        }
      }
      return path;
    }
    static addPointToPath(path, pt, xWall, f, yWall) {
      path.push(pt);
      switch (pt.orientation) {
        case OrientationEnum.Left:
          xWall.set(pt.x, pt.y, true);
          break;
        case OrientationEnum.Top:
          yWall.set(pt.x, pt.y, true);
          break;
        case OrientationEnum.Right:
          xWall.set(pt.x + 1, pt.y, true);
          break;
        case OrientationEnum.Bottom:
          yWall.set(pt.x, pt.y + 1, true);
          break;
      }
    }
  };

  // scripts/lib/fill.js
  function fill(x, y, width, height, visited, setFill) {
    let xx = x;
    let yy = y;
    while (true) {
      const ox = xx;
      const oy = yy;
      while (yy !== 0 && !visited(xx, yy - 1)) {
        yy--;
      }
      while (xx !== 0 && !visited(xx - 1, yy)) {
        xx--;
      }
      if (xx === ox && yy === oy) {
        break;
      }
    }
    fillCore(xx, yy, width, height, visited, setFill);
  }
  function fillCore(x, y, width, height, visited, setFill) {
    let lastRowLength = 0;
    do {
      let rowLength = 0;
      let sx = x;
      if (lastRowLength !== 0 && visited(x, y)) {
        do {
          if (--lastRowLength === 0) {
            return;
          }
        } while (visited(++x, y));
        sx = x;
      } else {
        for (; x !== 0 && !visited(x - 1, y); rowLength++, lastRowLength++) {
          x--;
          setFill(x, y);
          if (y !== 0 && !visited(x, y - 1)) {
            fill(x, y - 1, width, height, visited, setFill);
          }
        }
      }
      for (; sx < width && !visited(sx, y); rowLength++, sx++) {
        setFill(sx, y);
      }
      if (rowLength < lastRowLength) {
        for (const end = x + lastRowLength; ++sx < end; ) {
          if (!visited(sx, y)) {
            fillCore(sx, y, width, height, visited, setFill);
          }
        }
      } else if (rowLength > lastRowLength && y !== 0) {
        for (let ux = x + lastRowLength; ++ux < sx; ) {
          if (!visited(ux, y - 1)) {
            fill(ux, y - 1, width, height, visited, setFill);
          }
        }
      }
      lastRowLength = rowLength;
    } while (lastRowLength !== 0 && ++y < height);
  }

  // scripts/structs/boundingbox.js
  var BoundingBox = class {
    minX = Number.MAX_VALUE;
    minY = Number.MAX_VALUE;
    maxX = Number.MIN_VALUE;
    maxY = Number.MIN_VALUE;
    get width() {
      return this.maxX - this.minX + 1;
    }
    get height() {
      return this.maxY - this.minY + 1;
    }
  };

  // scripts/facetCreator.js
  var FacetCreator = class {
    static async getFacets(width, height, imgColorIndices, onUpdate = null) {
      const result = new FacetResult();
      result.width = width;
      result.height = height;
      const visited = new BooleanArray2D(result.width, result.height);
      result.facetMap = new Uint32Array2D(result.width, result.height);
      result.facets = [];
      let count = 0;
      for (let j = 0; j < result.height; j++) {
        for (let i = 0; i < result.width; i++) {
          const colorIndex = imgColorIndices.get(i, j);
          if (!visited.get(i, j)) {
            const facetIndex = result.facets.length;
            const facet = FacetCreator.buildFacet(facetIndex, colorIndex, i, j, visited, imgColorIndices, result);
            result.facets.push(facet);
            if (count % 100 === 0) {
              await delay(0);
              if (onUpdate != null) {
                onUpdate(count / (result.width * result.height));
              }
            }
          }
          count++;
        }
      }
      await delay(0);
      for (const f of result.facets) {
        if (f != null) {
          FacetCreator.buildFacetNeighbour(f, result);
        }
      }
      if (onUpdate != null) {
        onUpdate(1);
      }
      return result;
    }
    static buildFacet(facetIndex, facetColorIndex, x, y, visited, imgColorIndices, facetResult) {
      const facet = new Facet();
      facet.id = facetIndex;
      facet.color = facetColorIndex;
      facet.bbox = new BoundingBox();
      facet.borderPoints = [];
      facet.neighbourFacetsIsDirty = true;
      facet.neighbourFacets = null;
      fill(x, y, facetResult.width, facetResult.height, (ptx, pty) => visited.get(ptx, pty) || imgColorIndices.get(ptx, pty) !== facetColorIndex, (ptx, pty) => {
        visited.set(ptx, pty, true);
        facetResult.facetMap.set(ptx, pty, facetIndex);
        facet.pointCount++;
        const isInnerPoint = imgColorIndices.matchAllAround(ptx, pty, facetColorIndex);
        if (!isInnerPoint) {
          facet.borderPoints.push(new Point(ptx, pty));
        }
        if (ptx > facet.bbox.maxX) {
          facet.bbox.maxX = ptx;
        }
        if (pty > facet.bbox.maxY) {
          facet.bbox.maxY = pty;
        }
        if (ptx < facet.bbox.minX) {
          facet.bbox.minX = ptx;
        }
        if (pty < facet.bbox.minY) {
          facet.bbox.minY = pty;
        }
      });
      return facet;
    }
    static buildFacetNeighbour(facet, facetResult) {
      facet.neighbourFacets = [];
      const uniqueFacets = {};
      for (const pt of facet.borderPoints) {
        if (pt.x - 1 >= 0) {
          const leftFacetId = facetResult.facetMap.get(pt.x - 1, pt.y);
          if (leftFacetId !== facet.id) {
            uniqueFacets[leftFacetId] = true;
          }
        }
        if (pt.y - 1 >= 0) {
          const topFacetId = facetResult.facetMap.get(pt.x, pt.y - 1);
          if (topFacetId !== facet.id) {
            uniqueFacets[topFacetId] = true;
          }
        }
        if (pt.x + 1 < facetResult.width) {
          const rightFacetId = facetResult.facetMap.get(pt.x + 1, pt.y);
          if (rightFacetId !== facet.id) {
            uniqueFacets[rightFacetId] = true;
          }
        }
        if (pt.y + 1 < facetResult.height) {
          const bottomFacetId = facetResult.facetMap.get(pt.x, pt.y + 1);
          if (bottomFacetId !== facet.id) {
            uniqueFacets[bottomFacetId] = true;
          }
        }
      }
      for (const k of Object.keys(uniqueFacets)) {
        if (uniqueFacets.hasOwnProperty(k)) {
          facet.neighbourFacets.push(parseInt(k));
        }
      }
      facet.neighbourFacetsIsDirty = false;
    }
  };

  // scripts/lib/datastructs.js
  var Map = class {
    obj;
    constructor() {
      this.obj = {};
    }
    containsKey(key) {
      return key in this.obj;
    }
    getKeys() {
      const keys = [];
      for (const el in this.obj) {
        if (this.obj.hasOwnProperty(el)) {
          keys.push(el);
        }
      }
      return keys;
    }
    get(key) {
      const o = this.obj[key];
      if (typeof o === "undefined") {
        return null;
      } else {
        return o;
      }
    }
    put(key, value) {
      this.obj[key] = value;
    }
    remove(key) {
      delete this.obj[key];
    }
    clone() {
      const m = new Map();
      m.obj = {};
      for (const p in this.obj) {
        m.obj[p] = this.obj[p];
      }
      return m;
    }
  };
  var Heap = class {
    array;
    keyMap;
    constructor() {
      this.array = [];
      this.keyMap = new Map();
    }
    add(obj) {
      if (this.keyMap.containsKey(obj.getKey())) {
        throw new Error("Item with key " + obj.getKey() + " already exists in the heap");
      }
      this.array.push(obj);
      this.keyMap.put(obj.getKey(), this.array.length - 1);
      this.checkParentRequirement(this.array.length - 1);
    }
    replaceAt(idx, newobj) {
      this.array[idx] = newobj;
      this.keyMap.put(newobj.getKey(), idx);
      this.checkParentRequirement(idx);
      this.checkChildrenRequirement(idx);
    }
    shift() {
      return this.removeAt(0);
    }
    remove(obj) {
      const idx = this.keyMap.get(obj.getKey());
      if (idx === -1) {
        return;
      }
      this.removeAt(idx);
    }
    removeWhere(predicate) {
      const itemsToRemove = [];
      for (let i = this.array.length - 1; i >= 0; i--) {
        if (predicate(this.array[i])) {
          itemsToRemove.push(this.array[i]);
        }
      }
      for (const el of itemsToRemove) {
        this.remove(el);
      }
      for (const el of this.array) {
        if (predicate(el)) {
          console.log("Idx of element not removed: " + this.keyMap.get(el.getKey()));
          throw new Error("element not removed: " + el.getKey());
        }
      }
    }
    removeAt(idx) {
      const obj = this.array[idx];
      this.keyMap.remove(obj.getKey());
      const isLastElement = idx === this.array.length - 1;
      if (this.array.length > 0) {
        const newobj = this.array.pop();
        if (!isLastElement && this.array.length > 0) {
          this.replaceAt(idx, newobj);
        }
      }
      return obj;
    }
    foreach(func) {
      const arr = this.array.sort((e, e2) => e.compareTo(e2));
      for (const el of arr) {
        func(el);
      }
    }
    peek() {
      return this.array[0];
    }
    contains(key) {
      return this.keyMap.containsKey(key);
    }
    at(key) {
      const obj = this.keyMap.get(key);
      if (typeof obj === "undefined") {
        return null;
      } else {
        return this.array[obj];
      }
    }
    size() {
      return this.array.length;
    }
    checkHeapRequirement(item) {
      const idx = this.keyMap.get(item.getKey());
      if (idx != null) {
        this.checkParentRequirement(idx);
        this.checkChildrenRequirement(idx);
      }
    }
    checkChildrenRequirement(idx) {
      let stop = false;
      while (!stop) {
        const left = this.getLeftChildIndex(idx);
        let right = left === -1 ? -1 : left + 1;
        if (left === -1) {
          return;
        }
        if (right >= this.size()) {
          right = -1;
        }
        let minIdx;
        if (right === -1) {
          minIdx = left;
        } else {
          minIdx = this.array[left].compareTo(this.array[right]) < 0 ? left : right;
        }
        if (this.array[idx].compareTo(this.array[minIdx]) > 0) {
          this.swap(idx, minIdx);
          idx = minIdx;
        } else {
          stop = true;
        }
      }
    }
    checkParentRequirement(idx) {
      let curIdx = idx;
      let parentIdx = Heap.getParentIndex(curIdx);
      while (parentIdx >= 0 && this.array[parentIdx].compareTo(this.array[curIdx]) > 0) {
        this.swap(curIdx, parentIdx);
        curIdx = parentIdx;
        parentIdx = Heap.getParentIndex(curIdx);
      }
    }
    dump() {
      if (this.size() === 0) {
        return;
      }
      const idx = 0;
      const leftIdx = this.getLeftChildIndex(idx);
      const rightIdx = leftIdx + 1;
      console.log(this.array);
      console.log("--- keymap ---");
      console.log(this.keyMap);
    }
    swap(i, j) {
      this.keyMap.put(this.array[i].getKey(), j);
      this.keyMap.put(this.array[j].getKey(), i);
      const tmp = this.array[i];
      this.array[i] = this.array[j];
      this.array[j] = tmp;
    }
    getLeftChildIndex(curIdx) {
      const idx = (curIdx + 1) * 2 - 1;
      if (idx >= this.array.length) {
        return -1;
      } else {
        return idx;
      }
    }
    static getParentIndex(curIdx) {
      if (curIdx === 0) {
        return -1;
      }
      return Math.floor((curIdx + 1) / 2) - 1;
    }
    clone() {
      const h = new Heap();
      h.array = this.array.slice(0);
      h.keyMap = this.keyMap.clone();
      return h;
    }
  };
  var PriorityQueue = class {
    heap = new Heap();
    enqueue(obj) {
      this.heap.add(obj);
    }
    peek() {
      return this.heap.peek();
    }
    updatePriority(key) {
      this.heap.checkHeapRequirement(key);
    }
    get(key) {
      return this.heap.at(key);
    }
    get size() {
      return this.heap.size();
    }
    dequeue() {
      return this.heap.shift();
    }
    dump() {
      this.heap.dump();
    }
    contains(key) {
      return this.heap.contains(key);
    }
    removeWhere(predicate) {
      this.heap.removeWhere(predicate);
    }
    foreach(func) {
      this.heap.foreach(func);
    }
    clone() {
      const p = new PriorityQueue();
      p.heap = this.heap.clone();
      return p;
    }
  };

  // scripts/lib/polylabel.js
  function polylabel(polygon, precision = 1) {
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;
    for (let i = 0; i < polygon[0].length; i++) {
      const p = polygon[0][i];
      if (p.x < minX) {
        minX = p.x;
      }
      if (p.y < minY) {
        minY = p.y;
      }
      if (p.x > maxX) {
        maxX = p.x;
      }
      if (p.y > maxY) {
        maxY = p.y;
      }
    }
    const width = maxX - minX;
    const height = maxY - minY;
    const cellSize = Math.min(width, height);
    let h = cellSize / 2;
    const cellQueue = new PriorityQueue();
    if (cellSize === 0) {
      return { pt: { x: minX, y: minY }, distance: 0 };
    }
    for (let x = minX; x < maxX; x += cellSize) {
      for (let y = minY; y < maxY; y += cellSize) {
        cellQueue.enqueue(new Cell(x + h, y + h, h, polygon));
      }
    }
    let bestCell = getCentroidCell(polygon);
    const bboxCell = new Cell(minX + width / 2, minY + height / 2, 0, polygon);
    if (bboxCell.d > bestCell.d) {
      bestCell = bboxCell;
    }
    let numProbes = cellQueue.size;
    while (cellQueue.size > 0) {
      const cell = cellQueue.dequeue();
      if (cell.d > bestCell.d) {
        bestCell = cell;
      }
      if (cell.max - bestCell.d <= precision) {
        continue;
      }
      h = cell.h / 2;
      cellQueue.enqueue(new Cell(cell.x - h, cell.y - h, h, polygon));
      cellQueue.enqueue(new Cell(cell.x + h, cell.y - h, h, polygon));
      cellQueue.enqueue(new Cell(cell.x - h, cell.y + h, h, polygon));
      cellQueue.enqueue(new Cell(cell.x + h, cell.y + h, h, polygon));
      numProbes += 4;
    }
    return { pt: { x: bestCell.x, y: bestCell.y }, distance: bestCell.d };
  }
  var Cell = class {
    x;
    y;
    h;
    d;
    max;
    constructor(x, y, h, polygon) {
      this.x = x;
      this.y = y;
      this.h = h;
      this.d = pointToPolygonDist(x, y, polygon);
      this.max = this.d + this.h * Math.SQRT2;
    }
    compareTo(other) {
      return other.max - this.max;
    }
    getKey() {
      return this.x + "," + this.y;
    }
  };
  function getSegDistSq(px, py, a, b) {
    let x = a.x;
    let y = a.y;
    let dx = b.x - x;
    let dy = b.y - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = b.x;
        y = b.y;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = px - x;
    dy = py - y;
    return dx * dx + dy * dy;
  }
  function pointToPolygonDist(x, y, polygon) {
    let inside = false;
    let minDistSq = Infinity;
    for (let k = 0; k < polygon.length; k++) {
      const ring = polygon[k];
      for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
        const a = ring[i];
        const b = ring[j];
        if (a.y > y !== b.y > y && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) {
          inside = !inside;
        }
        minDistSq = Math.min(minDistSq, getSegDistSq(x, y, a, b));
      }
    }
    return (inside ? 1 : -1) * Math.sqrt(minDistSq);
  }
  function getCentroidCell(polygon) {
    let area = 0;
    let x = 0;
    let y = 0;
    const points = polygon[0];
    for (let i = 0, len = points.length, j = len - 1; i < len; j = i++) {
      const a = points[i];
      const b = points[j];
      const f = a.x * b.y - b.x * a.y;
      x += (a.x + b.x) * f;
      y += (a.y + b.y) * f;
      area += f * 3;
    }
    if (area === 0) {
      return new Cell(points[0].x, points[0].y, 0, polygon);
    }
    return new Cell(x / area, y / area, 0, polygon);
  }

  // scripts/facetLabelPlacer.js
  var FacetLabelPlacer = class {
    static async buildFacetLabelBounds(facetResult, onUpdate = null) {
      let count = 0;
      for (const f of facetResult.facets) {
        if (f != null) {
          const polyRings = [];
          const borderPath = f.getFullPathFromBorderSegments(true);
          polyRings.push(borderPath);
          const onlyOuterRing = [borderPath];
          if (f.neighbourFacetsIsDirty) {
            FacetCreator.buildFacetNeighbour(f, facetResult);
          }
          for (const neighbourIdx of f.neighbourFacets) {
            const neighbourPath = facetResult.facets[neighbourIdx].getFullPathFromBorderSegments(true);
            const fallsInside = FacetLabelPlacer.doesNeighbourFallInsideInCurrentFacet(neighbourPath, f, onlyOuterRing);
            if (fallsInside) {
              polyRings.push(neighbourPath);
            }
          }
          const result = polylabel(polyRings);
          f.labelBounds = new BoundingBox();
          const innerPadding = 2 * Math.sqrt(2 * result.distance);
          f.labelBounds.minX = result.pt.x - innerPadding;
          f.labelBounds.maxX = result.pt.x + innerPadding;
          f.labelBounds.minY = result.pt.y - innerPadding;
          f.labelBounds.maxY = result.pt.y + innerPadding;
          if (count % 100 === 0) {
            await delay(0);
            if (onUpdate != null) {
              onUpdate(f.id / facetResult.facets.length);
            }
          }
        }
        count++;
      }
      if (onUpdate != null) {
        onUpdate(1);
      }
    }
    static doesNeighbourFallInsideInCurrentFacet(neighbourPath, f, onlyOuterRing) {
      let fallsInside = true;
      for (let i = 0; i < neighbourPath.length && fallsInside; i++) {
        if (neighbourPath[i].x >= f.bbox.minX && neighbourPath[i].x <= f.bbox.maxX && neighbourPath[i].y >= f.bbox.minY && neighbourPath[i].y <= f.bbox.maxY) {
        } else {
          fallsInside = false;
        }
      }
      if (fallsInside) {
        for (let i = 0; i < neighbourPath.length && fallsInside; i++) {
          const distance = pointToPolygonDist(neighbourPath[i].x, neighbourPath[i].y, onlyOuterRing);
          if (distance < 0) {
            fallsInside = false;
          }
        }
      }
      return fallsInside;
    }
  };

  // scripts/facetReducer.js
  var FacetReducer = class {
    static async reduceFacets(smallerThan, removeFacetsFromLargeToSmall, maximumNumberOfFacets, colorsByIndex, facetResult, imgColorIndices, onUpdate = null) {
      const visitedCache = new BooleanArray2D(facetResult.width, facetResult.height);
      const colorDistances = ColorReducer.buildColorDistanceMatrix(colorsByIndex);
      const facetProcessingOrder = facetResult.facets.filter((f) => f != null).slice(0).sort((a, b) => b.pointCount > a.pointCount ? 1 : b.pointCount < a.pointCount ? -1 : 0).map((f) => f.id);
      if (!removeFacetsFromLargeToSmall) {
        facetProcessingOrder.reverse();
      }
      let curTime = new Date().getTime();
      for (let fidx = 0; fidx < facetProcessingOrder.length; fidx++) {
        const f = facetResult.facets[facetProcessingOrder[fidx]];
        if (f != null && f.pointCount < smallerThan) {
          FacetReducer.deleteFacet(f.id, facetResult, imgColorIndices, colorDistances, visitedCache);
          if (new Date().getTime() - curTime > 500) {
            curTime = new Date().getTime();
            await delay(0);
            if (onUpdate != null) {
              onUpdate(0.5 * fidx / facetProcessingOrder.length);
            }
          }
        }
      }
      let facetCount = facetResult.facets.filter((f) => f != null).length;
      if (facetCount > maximumNumberOfFacets) {
        console.log(`There are still ${facetCount} facets, more than the maximum of ${maximumNumberOfFacets}. Removing the smallest facets`);
      }
      const startFacetCount = facetCount;
      while (facetCount > maximumNumberOfFacets) {
        const facetProcessingOrder2 = facetResult.facets.filter((f) => f != null).slice(0).sort((a, b) => b.pointCount > a.pointCount ? 1 : b.pointCount < a.pointCount ? -1 : 0).map((f) => f.id).reverse();
        const facetToRemove = facetResult.facets[facetProcessingOrder2[0]];
        FacetReducer.deleteFacet(facetToRemove.id, facetResult, imgColorIndices, colorDistances, visitedCache);
        facetCount = facetResult.facets.filter((f) => f != null).length;
        if (new Date().getTime() - curTime > 500) {
          curTime = new Date().getTime();
          await delay(0);
          if (onUpdate != null) {
            onUpdate(0.5 + 0.5 - (facetCount - maximumNumberOfFacets) / (startFacetCount - maximumNumberOfFacets));
          }
        }
      }
      if (onUpdate != null) {
        onUpdate(1);
      }
    }
    static deleteFacet(facetIdToRemove, facetResult, imgColorIndices, colorDistances, visitedArrayCache) {
      const facetToRemove = facetResult.facets[facetIdToRemove];
      if (facetToRemove === null) {
        return;
      }
      if (facetToRemove.neighbourFacetsIsDirty) {
        FacetCreator.buildFacetNeighbour(facetToRemove, facetResult);
      }
      if (facetToRemove.neighbourFacets.length > 0) {
        for (let j = facetToRemove.bbox.minY; j <= facetToRemove.bbox.maxY; j++) {
          for (let i = facetToRemove.bbox.minX; i <= facetToRemove.bbox.maxX; i++) {
            if (facetResult.facetMap.get(i, j) === facetToRemove.id) {
              const closestNeighbour = FacetReducer.getClosestNeighbourForPixel(facetToRemove, facetResult, i, j, colorDistances);
              if (closestNeighbour !== -1) {
                imgColorIndices.set(i, j, facetResult.facets[closestNeighbour].color);
              } else {
                console.warn(`No closest neighbour found for point ${i},${j}`);
              }
            }
          }
        }
      } else {
        console.warn(`Facet ${facetToRemove.id} does not have any neighbours`);
      }
      FacetReducer.rebuildForFacetChange(visitedArrayCache, facetToRemove, imgColorIndices, facetResult);
      facetResult.facets[facetToRemove.id] = null;
    }
    static rebuildForFacetChange(visitedArrayCache, facet, imgColorIndices, facetResult) {
      FacetReducer.rebuildChangedNeighbourFacets(visitedArrayCache, facet, imgColorIndices, facetResult);
      let needsToRebuild = false;
      for (let y = facet.bbox.minY; y <= facet.bbox.maxY; y++) {
        for (let x = facet.bbox.minX; x <= facet.bbox.maxX; x++) {
          if (facetResult.facetMap.get(x, y) === facet.id) {
            console.warn(`Point ${x},${y} was reallocated to neighbours for facet ${facet.id}`);
            needsToRebuild = true;
            if (x - 1 >= 0 && facetResult.facetMap.get(x - 1, y) !== facet.id && facetResult.facets[facetResult.facetMap.get(x - 1, y)] !== null) {
              imgColorIndices.set(x, y, facetResult.facets[facetResult.facetMap.get(x - 1, y)].color);
            } else if (y - 1 >= 0 && facetResult.facetMap.get(x, y - 1) !== facet.id && facetResult.facets[facetResult.facetMap.get(x, y - 1)] !== null) {
              imgColorIndices.set(x, y, facetResult.facets[facetResult.facetMap.get(x, y - 1)].color);
            } else if (x + 1 < facetResult.width && facetResult.facetMap.get(x + 1, y) !== facet.id && facetResult.facets[facetResult.facetMap.get(x + 1, y)] !== null) {
              imgColorIndices.set(x, y, facetResult.facets[facetResult.facetMap.get(x + 1, y)].color);
            } else if (y + 1 < facetResult.height && facetResult.facetMap.get(x, y + 1) !== facet.id && facetResult.facets[facetResult.facetMap.get(x, y + 1)] !== null) {
              imgColorIndices.set(x, y, facetResult.facets[facetResult.facetMap.get(x, y + 1)].color);
            } else {
              console.error(`Unable to reallocate point ${x},${y}`);
            }
          }
        }
      }
      if (needsToRebuild) {
        FacetReducer.rebuildChangedNeighbourFacets(visitedArrayCache, facet, imgColorIndices, facetResult);
      }
    }
    static getClosestNeighbourForPixel(facetToRemove, facetResult, x, y, colorDistances) {
      let closestNeighbour = -1;
      let minDistance = Number.MAX_VALUE;
      let minColorDistance = Number.MAX_VALUE;
      if (facetToRemove.neighbourFacetsIsDirty) {
        FacetCreator.buildFacetNeighbour(facetToRemove, facetResult);
      }
      for (const neighbourIdx of facetToRemove.neighbourFacets) {
        const neighbour = facetResult.facets[neighbourIdx];
        if (neighbour != null) {
          for (const bpt of neighbour.borderPoints) {
            const distance = bpt.distanceToCoord(x, y);
            if (distance < minDistance) {
              minDistance = distance;
              closestNeighbour = neighbourIdx;
              minColorDistance = Number.MAX_VALUE;
            } else if (distance === minDistance) {
              const colorDistance = colorDistances[facetToRemove.color][neighbour.color];
              if (colorDistance < minColorDistance) {
                minColorDistance = colorDistance;
                closestNeighbour = neighbourIdx;
              }
            }
          }
        }
      }
      return closestNeighbour;
    }
    static rebuildChangedNeighbourFacets(visitedArrayCache, facetToRemove, imgColorIndices, facetResult) {
      const changedNeighboursSet = {};
      if (facetToRemove.neighbourFacetsIsDirty) {
        FacetCreator.buildFacetNeighbour(facetToRemove, facetResult);
      }
      for (const neighbourIdx of facetToRemove.neighbourFacets) {
        const neighbour = facetResult.facets[neighbourIdx];
        if (neighbour != null) {
          changedNeighboursSet[neighbourIdx] = true;
          if (neighbour.neighbourFacetsIsDirty) {
            FacetCreator.buildFacetNeighbour(neighbour, facetResult);
          }
          for (const n of neighbour.neighbourFacets) {
            changedNeighboursSet[n] = true;
          }
          const newFacet = FacetCreator.buildFacet(neighbourIdx, neighbour.color, neighbour.borderPoints[0].x, neighbour.borderPoints[0].y, visitedArrayCache, imgColorIndices, facetResult);
          facetResult.facets[neighbourIdx] = newFacet;
          if (newFacet.pointCount === 0) {
            facetResult.facets[neighbourIdx] = null;
          }
        }
      }
      if (facetToRemove.neighbourFacetsIsDirty) {
        FacetCreator.buildFacetNeighbour(facetToRemove, facetResult);
      }
      for (const neighbourIdx of facetToRemove.neighbourFacets) {
        const neighbour = facetResult.facets[neighbourIdx];
        if (neighbour != null) {
          for (let y = neighbour.bbox.minY; y <= neighbour.bbox.maxY; y++) {
            for (let x = neighbour.bbox.minX; x <= neighbour.bbox.maxX; x++) {
              if (facetResult.facetMap.get(x, y) === neighbour.id) {
                visitedArrayCache.set(x, y, false);
              }
            }
          }
        }
      }
      for (const k of Object.keys(changedNeighboursSet)) {
        if (changedNeighboursSet.hasOwnProperty(k)) {
          const neighbourIdx = parseInt(k);
          const f = facetResult.facets[neighbourIdx];
          if (f != null) {
            f.neighbourFacets = null;
            f.neighbourFacetsIsDirty = true;
          }
        }
      }
    }
  };

  // scripts/guiprocessmanager.js
  var ProcessResult = class {
    facetResult;
    colorsByIndex;
  };
  var GUIProcessManager = class {
    static async process(settings, cancellationToken2) {
      const c = document.getElementById("canvas");
      const ctx = c.getContext("2d");
      let imgData = ctx.getImageData(0, 0, c.width, c.height);
      if (settings.resizeImageIfTooLarge && (c.width > settings.resizeImageWidth || c.height > settings.resizeImageHeight)) {
        let width = c.width;
        let height = c.height;
        if (width > settings.resizeImageWidth) {
          const newWidth = settings.resizeImageWidth;
          const newHeight = c.height / c.width * settings.resizeImageWidth;
          width = newWidth;
          height = newHeight;
        }
        if (height > settings.resizeImageHeight) {
          const newHeight = settings.resizeImageHeight;
          const newWidth = width / height * newHeight;
          width = newWidth;
          height = newHeight;
        }
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCanvas.getContext("2d").drawImage(c, 0, 0, width, height);
        c.width = width;
        c.height = height;
        ctx.drawImage(tempCanvas, 0, 0, width, height);
        imgData = ctx.getImageData(0, 0, c.width, c.height);
      }
      $(".status .progress .determinate").css("width", "0px");
      $(".status").removeClass("complete");
      const tabsOutput = M.Tabs.getInstance(document.getElementById("tabsOutput"));
      const kmeansImgData = await GUIProcessManager.processKmeansClustering(imgData, tabsOutput, ctx, settings, cancellationToken2);
      let facetResult = new FacetResult();
      let colormapResult = new ColorMapResult();
      colormapResult = ColorReducer.createColorMap(kmeansImgData);
      if (settings.narrowPixelStripCleanupRuns === 0) {
        facetResult = await GUIProcessManager.processFacetBuilding(colormapResult, cancellationToken2);
        await GUIProcessManager.processFacetReduction(facetResult, tabsOutput, settings, colormapResult, cancellationToken2);
      } else {
        for (let run = 0; run < settings.narrowPixelStripCleanupRuns; run++) {
          await ColorReducer.processNarrowPixelStripCleanup(colormapResult);
          facetResult = await GUIProcessManager.processFacetBuilding(colormapResult, cancellationToken2);
          await GUIProcessManager.processFacetReduction(facetResult, tabsOutput, settings, colormapResult, cancellationToken2);
        }
      }
      await GUIProcessManager.processFacetBorderTracing(tabsOutput, facetResult, cancellationToken2);
      const cBorderSegment = await GUIProcessManager.processFacetBorderSegmentation(facetResult, tabsOutput, settings, cancellationToken2);
      await GUIProcessManager.processFacetLabelPlacement(facetResult, cBorderSegment, tabsOutput, cancellationToken2);
      const processResult2 = new ProcessResult();
      processResult2.facetResult = facetResult;
      processResult2.colorsByIndex = colormapResult.colorsByIndex;
      return processResult2;
    }
    static async processKmeansClustering(imgData, tabsOutput, ctx, settings, cancellationToken2) {
      time("K-means clustering");
      const cKmeans = document.getElementById("cKMeans");
      cKmeans.width = imgData.width;
      cKmeans.height = imgData.height;
      const ctxKmeans = cKmeans.getContext("2d");
      ctxKmeans.fillStyle = "white";
      ctxKmeans.fillRect(0, 0, cKmeans.width, cKmeans.height);
      const kmeansImgData = ctxKmeans.getImageData(0, 0, cKmeans.width, cKmeans.height);
      tabsOutput.select("kmeans-pane");
      $(".status.kMeans").addClass("active");
      await ColorReducer.applyKMeansClustering(imgData, kmeansImgData, ctx, settings, (kmeans) => {
        const progress = (100 - (kmeans.currentDeltaDistanceDifference > 100 ? 100 : kmeans.currentDeltaDistanceDifference)) / 100;
        $("#statusKMeans").css("width", Math.round(progress * 100) + "%");
        ctxKmeans.putImageData(kmeansImgData, 0, 0);
        console.log(kmeans.currentDeltaDistanceDifference);
        if (cancellationToken2.isCancelled) {
          throw new Error("Cancelled");
        }
      });
      $(".status").removeClass("active");
      $(".status.kMeans").addClass("complete");
      timeEnd("K-means clustering");
      return kmeansImgData;
    }
    static async processFacetBuilding(colormapResult, cancellationToken2) {
      time("Facet building");
      $(".status.facetBuilding").addClass("active");
      const facetResult = await FacetCreator.getFacets(colormapResult.width, colormapResult.height, colormapResult.imgColorIndices, (progress) => {
        if (cancellationToken2.isCancelled) {
          throw new Error("Cancelled");
        }
        $("#statusFacetBuilding").css("width", Math.round(progress * 100) + "%");
      });
      $(".status").removeClass("active");
      $(".status.facetBuilding").addClass("complete");
      timeEnd("Facet building");
      return facetResult;
    }
    static async processFacetReduction(facetResult, tabsOutput, settings, colormapResult, cancellationToken2) {
      time("Facet reduction");
      const cReduction = document.getElementById("cReduction");
      cReduction.width = facetResult.width;
      cReduction.height = facetResult.height;
      const ctxReduction = cReduction.getContext("2d");
      ctxReduction.fillStyle = "white";
      ctxReduction.fillRect(0, 0, cReduction.width, cReduction.height);
      const reductionImgData = ctxReduction.getImageData(0, 0, cReduction.width, cReduction.height);
      tabsOutput.select("reduction-pane");
      $(".status.facetReduction").addClass("active");
      await FacetReducer.reduceFacets(settings.removeFacetsSmallerThanNrOfPoints, settings.removeFacetsFromLargeToSmall, settings.maximumNumberOfFacets, colormapResult.colorsByIndex, facetResult, colormapResult.imgColorIndices, (progress) => {
        if (cancellationToken2.isCancelled) {
          throw new Error("Cancelled");
        }
        $("#statusFacetReduction").css("width", Math.round(progress * 100) + "%");
        let idx = 0;
        for (let j = 0; j < facetResult.height; j++) {
          for (let i = 0; i < facetResult.width; i++) {
            const facet = facetResult.facets[facetResult.facetMap.get(i, j)];
            const rgb = colormapResult.colorsByIndex[facet.color];
            reductionImgData.data[idx++] = rgb[0];
            reductionImgData.data[idx++] = rgb[1];
            reductionImgData.data[idx++] = rgb[2];
            idx++;
          }
        }
        ctxReduction.putImageData(reductionImgData, 0, 0);
      });
      $(".status").removeClass("active");
      $(".status.facetReduction").addClass("complete");
      timeEnd("Facet reduction");
    }
    static async processFacetBorderTracing(tabsOutput, facetResult, cancellationToken2) {
      time("Facet border tracing");
      tabsOutput.select("borderpath-pane");
      const cBorderPath = document.getElementById("cBorderPath");
      cBorderPath.width = facetResult.width;
      cBorderPath.height = facetResult.height;
      const ctxBorderPath = cBorderPath.getContext("2d");
      $(".status.facetBorderPath").addClass("active");
      await FacetBorderTracer.buildFacetBorderPaths(facetResult, (progress) => {
        if (cancellationToken2.isCancelled) {
          throw new Error("Cancelled");
        }
        $("#statusFacetBorderPath").css("width", Math.round(progress * 100) + "%");
        ctxBorderPath.fillStyle = "white";
        ctxBorderPath.fillRect(0, 0, cBorderPath.width, cBorderPath.height);
        for (const f of facetResult.facets) {
          if (f != null && f.borderPath != null) {
            ctxBorderPath.beginPath();
            ctxBorderPath.moveTo(f.borderPath[0].getWallX(), f.borderPath[0].getWallY());
            for (let i = 1; i < f.borderPath.length; i++) {
              ctxBorderPath.lineTo(f.borderPath[i].getWallX(), f.borderPath[i].getWallY());
            }
            ctxBorderPath.stroke();
          }
        }
      });
      $(".status").removeClass("active");
      $(".status.facetBorderPath").addClass("complete");
      timeEnd("Facet border tracing");
    }
    static async processFacetBorderSegmentation(facetResult, tabsOutput, settings, cancellationToken2) {
      time("Facet border segmentation");
      const cBorderSegment = document.getElementById("cBorderSegmentation");
      cBorderSegment.width = facetResult.width;
      cBorderSegment.height = facetResult.height;
      const ctxBorderSegment = cBorderSegment.getContext("2d");
      tabsOutput.select("bordersegmentation-pane");
      $(".status.facetBorderSegmentation").addClass("active");
      await FacetBorderSegmenter.buildFacetBorderSegments(facetResult, settings.nrOfTimesToHalveBorderSegments, (progress) => {
        if (cancellationToken2.isCancelled) {
          throw new Error("Cancelled");
        }
        $("#statusFacetBorderSegmentation").css("width", Math.round(progress * 100) + "%");
        ctxBorderSegment.fillStyle = "white";
        ctxBorderSegment.fillRect(0, 0, cBorderSegment.width, cBorderSegment.height);
        for (const f of facetResult.facets) {
          if (f != null && progress > f.id / facetResult.facets.length) {
            ctxBorderSegment.beginPath();
            const path = f.getFullPathFromBorderSegments(false);
            ctxBorderSegment.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
              ctxBorderSegment.lineTo(path[i].x, path[i].y);
            }
            ctxBorderSegment.stroke();
          }
        }
      });
      $(".status").removeClass("active");
      $(".status.facetBorderSegmentation").addClass("complete");
      timeEnd("Facet border segmentation");
      return cBorderSegment;
    }
    static async processFacetLabelPlacement(facetResult, cBorderSegment, tabsOutput, cancellationToken2) {
      time("Facet label placement");
      const cLabelPlacement = document.getElementById("cLabelPlacement");
      cLabelPlacement.width = facetResult.width;
      cLabelPlacement.height = facetResult.height;
      const ctxLabelPlacement = cLabelPlacement.getContext("2d");
      ctxLabelPlacement.fillStyle = "white";
      ctxLabelPlacement.fillRect(0, 0, cBorderSegment.width, cBorderSegment.height);
      ctxLabelPlacement.drawImage(cBorderSegment, 0, 0);
      tabsOutput.select("labelplacement-pane");
      $(".status.facetLabelPlacement").addClass("active");
      await FacetLabelPlacer.buildFacetLabelBounds(facetResult, (progress) => {
        if (cancellationToken2.isCancelled) {
          throw new Error("Cancelled");
        }
        $("#statusFacetLabelPlacement").css("width", Math.round(progress * 100) + "%");
        for (const f of facetResult.facets) {
          if (f != null && f.labelBounds != null) {
            ctxLabelPlacement.fillStyle = "red";
            ctxLabelPlacement.fillRect(f.labelBounds.minX, f.labelBounds.minY, f.labelBounds.width, f.labelBounds.height);
          }
        }
      });
      $(".status").removeClass("active");
      $(".status.facetLabelPlacement").addClass("complete");
      timeEnd("Facet label placement");
    }
    static async createSVG(facetResult, colorsByIndex, sizeMultiplier, fill2, stroke, addColorLabels, fontSize = 50, fontColor = "black", onUpdate = null) {
      const xmlns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(xmlns, "svg");
      svg.setAttribute("width", sizeMultiplier * facetResult.width + "");
      svg.setAttribute("height", sizeMultiplier * facetResult.height + "");
      let count = 0;
      for (const f of facetResult.facets) {
        if (f != null && f.borderSegments.length > 0) {
          let newpath = [];
          const useSegments = true;
          if (useSegments) {
            newpath = f.getFullPathFromBorderSegments(false);
          } else {
            for (let i = 0; i < f.borderPath.length; i++) {
              newpath.push(new Point(f.borderPath[i].getWallX() + 0.5, f.borderPath[i].getWallY() + 0.5));
            }
          }
          if (newpath[0].x !== newpath[newpath.length - 1].x || newpath[0].y !== newpath[newpath.length - 1].y) {
            newpath.push(newpath[0]);
          }
          const svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          let data = "M ";
          data += newpath[0].x * sizeMultiplier + " " + newpath[0].y * sizeMultiplier + " ";
          for (let i = 1; i < newpath.length; i++) {
            const midpointX = (newpath[i].x + newpath[i - 1].x) / 2;
            const midpointY = (newpath[i].y + newpath[i - 1].y) / 2;
            data += "Q " + midpointX * sizeMultiplier + " " + midpointY * sizeMultiplier + " " + newpath[i].x * sizeMultiplier + " " + newpath[i].y * sizeMultiplier + " ";
          }
          data += "Z";
          svgPath.setAttribute("data-facetId", f.id + "");
          svgPath.setAttribute("d", data);
          if (stroke) {
            svgPath.style.stroke = "#000";
          } else {
            if (fill2) {
              svgPath.style.stroke = `rgb(${colorsByIndex[f.color][0]},${colorsByIndex[f.color][1]},${colorsByIndex[f.color][2]})`;
            }
          }
          svgPath.style.strokeWidth = "1px";
          if (fill2) {
            svgPath.style.fill = `rgb(${colorsByIndex[f.color][0]},${colorsByIndex[f.color][1]},${colorsByIndex[f.color][2]})`;
          } else {
            svgPath.style.fill = "none";
          }
          svg.appendChild(svgPath);
          if (addColorLabels) {
            const txt = document.createElementNS(xmlns, "text");
            txt.setAttribute("font-family", "Tahoma");
            const nrOfDigits = (f.color + "").length;
            txt.setAttribute("font-size", fontSize / nrOfDigits + "");
            txt.setAttribute("dominant-baseline", "middle");
            txt.setAttribute("text-anchor", "middle");
            txt.setAttribute("fill", fontColor);
            txt.textContent = f.color + "";
            const subsvg = document.createElementNS(xmlns, "svg");
            subsvg.setAttribute("width", f.labelBounds.width * sizeMultiplier + "");
            subsvg.setAttribute("height", f.labelBounds.height * sizeMultiplier + "");
            subsvg.setAttribute("overflow", "visible");
            subsvg.setAttribute("viewBox", "-50 -50 100 100");
            subsvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
            subsvg.appendChild(txt);
            const g = document.createElementNS(xmlns, "g");
            g.setAttribute("class", "label");
            g.setAttribute("transform", "translate(" + f.labelBounds.minX * sizeMultiplier + "," + f.labelBounds.minY * sizeMultiplier + ")");
            g.appendChild(subsvg);
            svg.appendChild(g);
          }
          if (count % 100 === 0) {
            await delay(0);
            if (onUpdate != null) {
              onUpdate(f.id / facetResult.facets.length);
            }
          }
        }
        count++;
      }
      if (onUpdate != null) {
        onUpdate(1);
      }
      return svg;
    }
  };

  // scripts/gui.js
  var processResult = null;
  var cancellationToken = new CancellationToken();
  var timers = {};
  function time(name) {
    console.time(name);
    timers[name] = new Date();
  }
  function timeEnd(name) {
    console.timeEnd(name);
    const ms = new Date().getTime() - timers[name].getTime();
    log(name + ": " + ms + "ms");
    delete timers[name];
  }
  function log(str) {
    $("#log").append("<br/><span>" + str + "</span>");
  }
  function parseSettings() {
    const settings = new Settings();
    if ($("#optColorSpaceRGB").prop("checked")) {
      settings.kMeansClusteringColorSpace = ClusteringColorSpace.RGB;
    } else if ($("#optColorSpaceHSL").prop("checked")) {
      settings.kMeansClusteringColorSpace = ClusteringColorSpace.HSL;
    } else if ($("#optColorSpaceRGB").prop("checked")) {
      settings.kMeansClusteringColorSpace = ClusteringColorSpace.LAB;
    }
    if ($("#optFacetRemovalLargestToSmallest").prop("checked")) {
      settings.removeFacetsFromLargeToSmall = true;
    } else {
      settings.removeFacetsFromLargeToSmall = false;
    }
    settings.randomSeed = parseInt($("#txtRandomSeed").val() + "");
    settings.kMeansNrOfClusters = parseInt($("#txtNrOfClusters").val() + "");
    settings.kMeansMinDeltaDifference = parseFloat($("#txtClusterPrecision").val() + "");
    settings.removeFacetsSmallerThanNrOfPoints = parseInt($("#txtRemoveFacetsSmallerThan").val() + "");
    settings.maximumNumberOfFacets = parseInt($("#txtMaximumNumberOfFacets").val() + "");
    settings.nrOfTimesToHalveBorderSegments = parseInt($("#txtNrOfTimesToHalveBorderSegments").val() + "");
    settings.narrowPixelStripCleanupRuns = parseInt($("#txtNarrowPixelStripCleanupRuns").val() + "");
    settings.resizeImageIfTooLarge = $("#chkResizeImage").prop("checked");
    settings.resizeImageWidth = parseInt($("#txtResizeWidth").val() + "");
    settings.resizeImageHeight = parseInt($("#txtResizeHeight").val() + "");
    const restrictedColorLines = ($("#txtKMeansColorRestrictions").val() + "").split("\n");
    for (const line of restrictedColorLines) {
      const tline = line.trim();
      if (tline.indexOf("//") === 0) {
      } else {
        const rgbparts = tline.split(",");
        if (rgbparts.length === 3) {
          let red = parseInt(rgbparts[0]);
          let green = parseInt(rgbparts[1]);
          let blue = parseInt(rgbparts[2]);
          if (red < 0)
            red = 0;
          if (red > 255)
            red = 255;
          if (green < 0)
            green = 0;
          if (green > 255)
            green = 255;
          if (blue < 0)
            blue = 0;
          if (blue > 255)
            blue = 255;
          if (!isNaN(red) && !isNaN(green) && !isNaN(blue)) {
            settings.kMeansColorRestrictions.push([red, green, blue]);
          }
        }
      }
    }
    return settings;
  }
  async function process() {
    try {
      const settings = parseSettings();
      cancellationToken.isCancelled = true;
      cancellationToken = new CancellationToken();
      processResult = await GUIProcessManager.process(settings, cancellationToken);
      await updateOutput();
      const tabsOutput = M.Tabs.getInstance(document.getElementById("tabsOutput"));
      tabsOutput.select("output-pane");
    } catch (e) {
      log("Error: " + e.message + " at " + e.stack);
    }
  }
  async function updateOutput() {
    if (processResult != null) {
      const showLabels = $("#chkShowLabels").prop("checked");
      const fill2 = $("#chkFillFacets").prop("checked");
      const stroke = $("#chkShowBorders").prop("checked");
      const sizeMultiplier = parseInt($("#txtSizeMultiplier").val() + "");
      const fontSize = parseInt($("#txtLabelFontSize").val() + "");
      const fontColor = $("#txtLabelFontColor").val() + "";
      $("#statusSVGGenerate").css("width", "0%");
      $(".status.SVGGenerate").removeClass("complete");
      $(".status.SVGGenerate").addClass("active");
      const svg = await GUIProcessManager.createSVG(processResult.facetResult, processResult.colorsByIndex, sizeMultiplier, fill2, stroke, showLabels, fontSize, fontColor, (progress) => {
        if (cancellationToken.isCancelled) {
          throw new Error("Cancelled");
        }
        $("#statusSVGGenerate").css("width", Math.round(progress * 100) + "%");
      });
      $("#svgContainer").empty().append(svg);
      $("#palette").empty().append(createPaletteHtml(processResult.colorsByIndex));
      $("#palette .color").tooltip();
      $(".status").removeClass("active");
      $(".status.SVGGenerate").addClass("complete");
    }
  }
  function createPaletteHtml(colorsByIndex) {
    let html = "";
    for (let c = 0; c < colorsByIndex.length; c++) {
      const style = `background-color: rgb(${colorsByIndex[c][0]},${colorsByIndex[c][1]},${colorsByIndex[c][2]})`;
      html += `<div class="color" class="tooltipped" style="${style}" data-tooltip="${colorsByIndex[c][0]},${colorsByIndex[c][1]},${colorsByIndex[c][2]}">${c}</div>`;
    }
    return $(html);
  }
  function downloadPalettePng() {
    if (processResult == null) {
      return;
    }
    const colorsByIndex = processResult.colorsByIndex;
    const canvas = document.createElement("canvas");
    const nrOfItemsPerRow = 10;
    const nrRows = Math.ceil(colorsByIndex.length / nrOfItemsPerRow);
    const margin = 10;
    const cellWidth = 80;
    const cellHeight = 70;
    canvas.width = margin + nrOfItemsPerRow * (cellWidth + margin);
    canvas.height = margin + nrRows * (cellHeight + margin);
    const ctx = canvas.getContext("2d");
    ctx.translate(0.5, 0.5);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < colorsByIndex.length; i++) {
      const color = colorsByIndex[i];
      const x = margin + i % nrOfItemsPerRow * (cellWidth + margin);
      const y = margin + Math.floor(i / nrOfItemsPerRow) * (cellHeight + margin);
      ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      ctx.fillRect(x, y, cellWidth, cellHeight - 20);
      ctx.strokeStyle = "#888";
      ctx.strokeRect(x, y, cellWidth, cellHeight - 20);
      const nrText = i + "";
      ctx.fillStyle = "black";
      ctx.strokeStyle = "#CCC";
      ctx.font = "20px Tahoma";
      const nrTextSize = ctx.measureText(nrText);
      ctx.lineWidth = 2;
      ctx.strokeText(nrText, x + cellWidth / 2 - nrTextSize.width / 2, y + cellHeight / 2 - 5);
      ctx.fillText(nrText, x + cellWidth / 2 - nrTextSize.width / 2, y + cellHeight / 2 - 5);
      ctx.lineWidth = 1;
      ctx.font = "10px Tahoma";
      const rgbText = "RGB: " + Math.floor(color[0]) + "," + Math.floor(color[1]) + "," + Math.floor(color[2]);
      const rgbTextSize = ctx.measureText(rgbText);
      ctx.fillStyle = "black";
      ctx.fillText(rgbText, x + cellWidth / 2 - rgbTextSize.width / 2, y + cellHeight - 10);
    }
    const dataURL = canvas.toDataURL("image/png");
    const dl = document.createElement("a");
    document.body.appendChild(dl);
    dl.setAttribute("href", dataURL);
    dl.setAttribute("download", "palette.png");
    dl.click();
  }
  function downloadPNG() {
    if ($("#svgContainer svg").length > 0) {
      saveSvgAsPng($("#svgContainer svg").get(0), "paintbynumbers.png");
    }
  }
  function downloadSVG() {
    if ($("#svgContainer svg").length > 0) {
      const svgEl = $("#svgContainer svg").get(0);
      svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const svgData = svgEl.outerHTML;
      const preface = '<?xml version="1.0" standalone="no"?>\r\n';
      const svgBlob = new Blob([preface, svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = "paintbynumbers.svg";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  }
  function loadExample(imgId) {
    const img = document.getElementById(imgId);
    const c = document.getElementById("canvas");
    const ctx = c.getContext("2d");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
  }

  // scripts/lib/clipboard.js
  var Clipboard = class {
    ctrl_pressed = false;
    command_pressed = false;
    pasteCatcher;
    paste_event_support = false;
    canvas;
    ctx;
    autoresize;
    constructor(canvas_id, autoresize) {
      const _self = this;
      this.canvas = document.getElementById(canvas_id);
      this.ctx = this.canvas.getContext("2d");
      this.autoresize = autoresize;
      document.addEventListener("paste", function(e) {
        _self.paste_auto(e);
      }, false);
      this.init();
    }
    init() {
      this.pasteCatcher = document.createElement("div");
      this.pasteCatcher.setAttribute("id", "paste_ff");
      this.pasteCatcher.setAttribute("contenteditable", "");
      this.pasteCatcher.style.cssText = "opacity:0;position:fixed;top:0px;left:0px;width:10px;margin-left:-20px;";
      document.body.appendChild(this.pasteCatcher);
      const _self = this;
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (_self.paste_event_support === true || _self.ctrl_pressed === false || mutation.type !== "childList") {
            return true;
          }
          if (mutation.addedNodes.length === 1) {
            if (mutation.addedNodes[0].src !== void 0) {
              _self.paste_createImage(mutation.addedNodes[0].src);
            }
            setTimeout(function() {
              _self.pasteCatcher.innerHTML = "";
            }, 20);
          }
          return false;
        });
      });
      const target = document.getElementById("paste_ff");
      const config = { attributes: true, childList: true, characterData: true };
      observer.observe(target, config);
    }
    paste_auto(e) {
      this.paste_event_support = false;
      if (this.pasteCatcher !== void 0) {
        this.pasteCatcher.innerHTML = "";
      }
      if (e.clipboardData) {
        const items = e.clipboardData.items;
        if (items) {
          this.paste_event_support = true;
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
              const blob = items[i].getAsFile();
              const URLObj = window.URL || window.webkitURL;
              const source = URLObj.createObjectURL(blob);
              this.paste_createImage(source);
              e.preventDefault();
              return false;
            }
          }
        } else {
        }
      }
      return true;
    }
    on_keyboard_action(event) {
      const k = event.keyCode;
      if (k === 17 || event.metaKey || event.ctrlKey) {
        if (this.ctrl_pressed === false) {
          this.ctrl_pressed = true;
        }
      }
      if (k === 86) {
        if (document.activeElement !== void 0 && document.activeElement.type === "text") {
          return false;
        }
        if (this.ctrl_pressed === true && this.pasteCatcher !== void 0) {
          this.pasteCatcher.focus();
        }
      }
      return true;
    }
    on_keyboardup_action(event) {
      if (event.ctrlKey === false && this.ctrl_pressed === true) {
        this.ctrl_pressed = false;
      } else if (event.metaKey === false && this.command_pressed === true) {
        this.command_pressed = false;
        this.ctrl_pressed = false;
      }
    }
    paste_createImage(source) {
      const pastedImage = new Image();
      const self = this;
      pastedImage.onload = function() {
        if (self.autoresize === true) {
          self.canvas.width = pastedImage.width;
          self.canvas.height = pastedImage.height;
        } else {
          self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
        }
        self.ctx.drawImage(pastedImage, 0, 0);
      };
      pastedImage.src = source;
    }
  };

  // scripts/main.js
  $(document).ready(function() {
    $(".tabs").tabs();
    $(".tooltipped").tooltip();
    const clip = new Clipboard("canvas", true);
    $("#file").change(function(ev) {
      const files = $("#file").get(0).files;
      if (files !== null && files.length > 0) {
        const reader = new FileReader();
        reader.onloadend = function() {
          const img = document.createElement("img");
          img.onload = () => {
            const c = document.getElementById("canvas");
            const ctx = c.getContext("2d");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
          };
          img.onerror = () => {
            alert("Unable to load image");
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(files[0]);
      }
    });
    loadExample("imgSmall");
    $("#btnProcess").click(async function() {
      try {
        await process();
      } catch (err) {
        alert("Error: " + err);
      }
    });
    $("#chkShowLabels, #chkFillFacets, #chkShowBorders, #txtSizeMultiplier, #txtLabelFontSize, #txtLabelFontColor").change(async () => {
      await updateOutput();
    });
    $("#btnDownloadSVG").click(function() {
      downloadSVG();
    });
    $("#btnDownloadPNG").click(function() {
      downloadPNG();
    });
    $("#btnDownloadPalettePNG").click(function() {
      downloadPalettePng();
    });
    $("#lnkTrivial").click(() => {
      loadExample("imgTrivial");
      return false;
    });
    $("#lnkSmall").click(() => {
      loadExample("imgSmall");
      return false;
    });
    $("#lnkMedium").click(() => {
      loadExample("imgMedium");
      return false;
    });
  });
})();
