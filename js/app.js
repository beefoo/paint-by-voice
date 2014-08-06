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
        this.setupLog(); 
      }
      
      this.setupColors();
            
      this.drawRaster('image-source', 'canvas-target');
      
    };
    
    App.prototype.initListeners = function(){
      
      var that = this;      
      
      $("body").hammer().on("tap", function(e) {        
        that.doNextInstruction();        
      });
    };
    
    App.prototype.doNextInstruction = function(){
      if (this.instructionIndex >= this.instructions.length) return false;
      
      var instruction = this.instructions[this.instructionIndex],
          $overlay = $('#portrait-overlay'),
          $cell = $('#active-cell');
      
      // setup overlay and cell
      if (!$overlay.hasClass('active')) {
        $overlay.addClass('active');
        $cell.width(instruction.w);
        $cell.height(instruction.h);
      }
      
      // style cell
      $cell.css({
        top: instruction.y + 'px',
        left: instruction.x + 'px',
        background: instruction.hex
      });
      
      console.log(instruction.words);   
      
      this.instructionIndex++;  
    };
    
    App.prototype.drawRaster = function(sourceId, targetId){      
      // setup canvas
      var that = this,
          $canvas = $('#'+targetId),
          p = this.setupPaper($canvas, 400, 500);
      
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
          gridSize = this.options.gridSize,
          rW = raster.width,
          rH = raster.height,
          targetW = Math.round(rW/gridSize),
          targetH = Math.round(rH/gridSize);
      
      // init cells
      this.cells = [];
      
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
          that.cells.push({
            x: x*gridSize, y: y*gridSize,
            hex: color.toCSS(true),
            w: gridSize, h: gridSize,
            words: that.getColorWords(h, s, b)
          });

        }
      }
      
      if (this.options.debug) {
        this.logColorReport();
      }
      
      this.setupInstructions(targetW, targetH, gridSize);
      this.initListeners();
    };
    
    App.prototype.getColorWords = function(h, s, b){      
      var words = "",
          hWord = this.hList[h],
          sWord = this.sList[s],
          bWord = this.bList[b];
      
      // add hue word (e.g. red, yellow, blue)
      words = hWord.words;
      
      if (this.options.debug) {
        this.logColor(h, s, b, hWord, sWord, bWord);
      }
      
      // add saturation word (e.g. dull, bold)
      if (sWord.override) words = sWord.words;
      else if (sWord.words.length) words = sWord.words + " " + words;
      
      // add brightness word (e.g. light, dark)
      if (bWord.override) words = bWord.words;
      else if (bWord.words.length) words = bWord.words + " " + words;
      
      // check if this color is blank
      if (this.isBlank(h, s, b)) {
        words = "leave blank";
      }
      
      return words;      
    };
    
    App.prototype.isBlank = function(h, s, b){
      return (s<=0 && b>=100);
    };
    
    App.prototype.logColor = function(h, s, b, hWord, sWord, bWord){
      if (this.isBlank(h, s, b)) {
        this.colorStats.h.push("blank");
        this.colorStats.s.push("blank");
        this.colorStats.b.push("blank");
        
      } else {
        this.colorStats.h.push(hWord.words);
        this.colorStats.s.push(sWord.words);
        this.colorStats.b.push(bWord.words);
      }
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
    
    App.prototype.setupInstructions = function(w, h, gridSize){
      var that = this,
          layout = (w>h) ? 'landscape' : 'portrait',
          minD = _.min([w, h]),
          center = Math.floor(minD/2),
          x = 1, y = 0,
          delta = [1, 0],
          instructions = [];      
      
      if (layout==='landscape' && minD%2===0){
        y--;
      }
      
      // TODO: deal with odd dimensions and landscape dimensions
      // http://stackoverflow.com/questions/3706219/algorithm-for-iterating-over-an-outward-spiral-on-a-discrete-2d-grid-from-the-or
      
      // do a square spiral first
      _.times(Math.pow(minD, 2), function(i){
        var cx = x+center-1,
            cy = -1*y+center,
            cell = that.cells[cx+cy*w];
        
        instructions.push(cell);
        
        // console.log(x, y, cx, cy, cell.x, cell.y);
        
        // change direction
        if ((x>0 && y>0 && x===y) 
              || (x>0 && x===1-y)
              || (x<=0 && Math.abs(x)+1===Math.abs(y))
        ){     
          delta = [-delta[1], delta[0]];     
        }
        
        // step x/y
        x += delta[0];
        y += delta[1];
      });
      
      // zig-zag the rest
      
      // set instructions for class access      
      this.instructions = instructions;      
      this.instructionIndex = 0;      
    };
    
    App.prototype.setupLog = function(){      
      this.colorStats = {
        'h': [],
        's': [],
        'b': []
      };
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
