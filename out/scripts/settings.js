export var ClusteringColorSpace;
(function (ClusteringColorSpace) {
    ClusteringColorSpace[ClusteringColorSpace["RGB"] = 0] = "RGB";
    ClusteringColorSpace[ClusteringColorSpace["HSL"] = 1] = "HSL";
    ClusteringColorSpace[ClusteringColorSpace["LAB"] = 2] = "LAB";
})(ClusteringColorSpace || (ClusteringColorSpace = {}));
export class Settings {
    kMeansNrOfClusters = 16;
    kMeansMinDeltaDifference = 1;
    kMeansClusteringColorSpace = ClusteringColorSpace.RGB;
    kMeansColorRestrictions = [];
    colorAliases = {};
    narrowPixelStripCleanupRuns = 3; // 3 seems like a good compromise between removing enough narrow pixel strips to convergence. This fixes e.g. https://i.imgur.com/dz4ANz1.png
    removeFacetsSmallerThanNrOfPoints = 20;
    removeFacetsFromLargeToSmall = true;
    maximumNumberOfFacets = Number.MAX_VALUE;
    nrOfTimesToHalveBorderSegments = 2;
    resizeImageIfTooLarge = true;
    resizeImageWidth = 1024;
    resizeImageHeight = 1024;
    randomSeed = new Date().getTime();
}
