(function() {
  var App;

  App = (function() {
    function App(options) {
      var defaults = {};
      this.options = $.extend(defaults, options);
      this.init();      
    }   
    
    App.prototype.init = function(){      
      this.paper = false;
      this.raster = false;
      
      if (this.options.debug) {
        this.colorStats = {
          'h': [],
          's': [],
          'b': []
        };  
      }
      
      this.setupColors();
            
      this.drawRaster('image-source', 'canvas-target');
    };
    
    App.prototype.drawRaster = function(sourceId, targetId){      
      // setup canvas
      var that = this,
          $canvas = $('#'+targetId),
          p = this.setupPaper($canvas, 400, 600);
      
      // init view
      $canvas.removeClass('loaded'); 
      
      // setup raster
      this.setupRaster(p, sourceId);      
      
      // draw
      p.view.draw();
      $canvas.addClass('loaded');      
    };
    
    App.prototype.drawRasterCells = function(p, raster){
      var that = this,
          gridSize = 20,
          rW = raster.width,
          rH = raster.height,
          targetW = Math.round(rW/gridSize),
          targetH = Math.round(rH/gridSize);
      
      // init colors
      this.colors = [];
      
      // Downsize the pixel content
      raster.size = new p.Size(targetW, targetH);
      
      // Loop through pixels
      for (var y = 0; y < targetH; y++) {
        for(var x = 0; x < targetW; x++) {
          
          // Get the color of the pixel:
          var color = raster.getPixel(x, y),
              h = Math.round(color.hue),
              s = Math.round(color.saturation * 100),
              b = Math.round(color.brightness * 100);
    
          // Create the cell
          var path = new p.Path.Rectangle({
            point: [x*gridSize, y*gridSize],
            size: [gridSize, gridSize],
            fillColor: color
          });
          
          // add color to colors
          that.colors.push({
            x: x, y: y,
            // h: h, s: s, b: b,
            words: that.getColorWords(h, s, b)
          });

        }
      }
      
      if (this.options.debug) {
        this.logColorReport();
      }
    };
    
    App.prototype.getColorWords = function(h, s, b){      
      var words = "",
          hWord = this.hList[h],
          sWord = this.sList[s],
          bWord = this.bList[b];
      
      // add hue word (e.g. red, yellow, blue)
      words = hWord.words;
      
      if (this.options.debug) {
        this.colorStats.h.push(hWord.words);
        this.colorStats.s.push(sWord.words);
        this.colorStats.b.push(bWord.words);
      }
      
      // add saturation word (e.g. dull, bold)
      if (sWord.override) words = sWord.words;
      else if (sWord.words.length) words = sWord.words + " " + words;
      
      // add brightness word (e.g. light, dark)
      if (bWord.override) words = bWord.words;
      else if (bWord.words.length) words = bWord.words + " " + words;
      
      return words;      
    };
    
    App.prototype.logColorReport = function(){
      var hGroups = _.groupBy(this.colorStats.h, function(h){ return h; }),
          sGroups = _.groupBy(this.colorStats.s, function(s){ return s; }),
          bGroups = _.groupBy(this.colorStats.b, function(b){ return b; });
          
      console.log(hGroups);
    };
    
    App.prototype.setupColors = function(){
      var that = this,
          hList = this.options.colorHueList,
          sList = this.options.colorSaturationList,
          bList = this.options.colorBrightnessList;
          
      this.hList = [];
      this.sList = [];
      this.bList = [];
      
      // populate hue list
      _.each(hList, function(h){
        for (var i=h.range[0]; i<=h.range[1]; i++) {
          that.hList.push({
            words: h.words
          });
        }
      });
      
      // populate saturation list
      _.each(sList, function(s){
        for (var i=s.range[0]; i<=s.range[1]; i++) {
          that.sList.push({
            words: s.words,
            override: s.override
          });
        }
      });
      
      // populate brightness list
      _.each(bList, function(b){
        for (var i=b.range[0]; i<=b.range[1]; i++) {
          that.bList.push({
            words: b.words,
            override: b.override
          });
        }
      });
    };
    
    App.prototype.setupPaper = function($canvas, width, height){      
      // setup canvas dimensions      
      $canvas.width(width);
      $canvas.height(height);    
      
      if (!this.paper) {        
        // init paper
        var canvas = $canvas[0];
        this.paper = paper.setup(canvas);
      }
      
      return this.paper;
    };
    
    App.prototype.setupRaster = function(p, imageId){      
      // raster already setup, just draw cells    
      if (this.raster) {
        this.drawRasterCells(p, this.raster);
        return true;
      }
      
      // setup raster, then draw cells upon load
      var that = this,
          raster = new p.Raster(imageId);
      raster.visible = false;
      raster.on('load', function() {          
        if (that.options.debug) console.log('raster loaded');          
        that.raster = raster;        
        that.drawRasterCells(p, raster);     
      });
    };

    return App;

  })();

  $(function() {
    return new App(config);
  });

}).call(this);
