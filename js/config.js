var config = {
  debug: true,
  gridSize: 20,
  // Range: 0-360
  colorHueList: [
    {words: "red", range: [0, 10]},
    {words: "orange", range: [11, 35]},
    {words: "yellow", range: [36, 50]},
    {words: "green", range: [51, 140]},
    {words: "cyan", range: [141, 190]},
    {words: "blue", range: [191, 258]},
    {words: "violet", range: [259, 288]},
    {words: "magenta", range: [289, 340]},
    {words: "red", range: [341, 360]}
  ],
  // Range: 0-100
  colorSaturationList: [
    {words: "gray", range: [0, 10], override: true},
    {words: "very dull", range: [11, 35]},
    {words: "dull", range: [36, 65]},
    {words: "bold", range: [66, 85]},
    {words: "very bold", range: [86, 100]}
  ],
  // Range: 0-100
  colorBrightnessList: [
    {words: "black", range: [0, 5], override: true},
    {words: "very dark", range: [6, 20]},
    {words: "dark", range: [21, 40]},
    {words: "", range: [41, 70]},
    {words: "light", range: [71, 90]},
    {words: "very light", range: [91, 100]}
  ]
};
