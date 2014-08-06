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
      
      var interval = setInterval(function(){
        var success = that.doNextInstruction();
        if (!success) clearInterval(interval);
      }, 6000);
      
      $("body").hammer().on("tap", function(e) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        } else {
          that.doNextInstruction();
        }               
      });
    };
    
    App.prototype.addInstruction = function(w, h, x, y, center, delta, strategy){
      var cx = x+center-1,
          cy = -1*y+center,
          cell = this.cells[cx+cy*w],
          d = delta;
          
      // define direction words
      if (!d) {        
        directionWords = "begin just above center, paint";
        
      } else {
        directionWords = "go";
        if (d[0] > 0) directionWords += " right, paint";
        else if (d[0] < 0) directionWords += " left, paint";
        else if (d[1] > 0) directionWords += " up, paint";
        else if (d[1] < 0) directionWords += " down, paint";
      }
      
      // keep track of words and direction in
      cell.words = directionWords + " " + cell.words;
      cell.dIn = d;    
      // console.log(x, y, cx, cy, cell.x, cell.y);

      // keep track of direction out
      d = this.getDelta(d, w, h, x, y, strategy);      
      cell.dOut = d;
      
      return cell;
    };
    
    App.prototype.doNextInstruction = function(){      
      var instruction = this.instructions[this.instructionIndex],
          $overlay = $('#portrait-overlay'),
          $cell = $('#active-cell');
          
      if (!instruction) return false;
      
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
      
      // console.log(instruction.words);
      this.speakWords(instruction.words);  
      
      this.instructionIndex++;
      
      return true;
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
    
    App.prototype.getDelta = function(delta, w, h, x, y, strategy){
      
      // if no delta, define beginning
      if (!delta) {
        if (strategy==='spiralEven') delta = [1, 0];
        else if (strategy==='spiralOdd') delta = [0, -1];
      }
      
      // counter-clockwise spiral with even rows/columns
      if (strategy==='spiralEven') {
        if ((x>0 && y>0 && x===y) 
              || (x>0 && x===1-y)
              || (x<=0 && Math.abs(x)+1===Math.abs(y))
        ){     
          delta = [-delta[1], delta[0]];
        }
      }
      
      // counter-clockwise spiral with odd rows/columns
      if (strategy==='spiralOdd') {
        if (x===y  || (x<0 && x===-y) || (x>0 && x===1-y)){
          delta = [-delta[1], delta[0]];         
        }
      }
      
      // zig zag strategy
      if (strategy==='zigZag') {        
        var minxX = w/2*-1,
            minY = w/2;
                    
        if (x-1<=minxX || x>=minY){
          if (delta[1]===0) {
            delta = [0,-1];
          } else {
            delta[0] = x > 0 ? -1 : 1;
            delta[1] = 0;            
          }
        } 
      }
      
      return delta;
        
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

    // Based on: http://stackoverflow.com/questions/398299/looping-in-a-spiral
    App.prototype.setupInstructions = function(w, h, gridSize){
      var that = this,
          layout = (w>h) ? 'landscape' : 'portrait',
          minD = _.min([w, h]),
          center = Math.floor(minD/2),
          x = 1, y = 0,
          delta = false,
          instructions = [],
          totalCount = w*h,
          spiralCount = Math.pow(minD, 2),
          zigZagCount = totalCount - spiralCount;
      
      // TODO: deal with odd dimensions and landscape dimensions
      // http://stackoverflow.com/questions/3706219/algorithm-for-iterating-over-an-outward-spiral-on-a-discrete-2d-grid-from-the-or
      if (layout==='landscape' && minD%2===0){
        y--;
      }
      if (minD%2===1) {
        x = 0;
      }
      
      // do a square spiral first
      _.times(spiralCount, function(i){        
        var cell = that.addInstruction(w, h, x, y, center, delta, 'spiralEven');        
        instructions.push(cell);
        
        // step x/y
        delta = cell.dOut;
        x += delta[0];
        y += delta[1];
      });
      
      // zig-zag the rest
      _.times(zigZagCount, function(j){
        var cell = that.addInstruction(w, h, x, y, center, delta, 'zigZag');        
        instructions.push(cell); 
        
        // step x/y
        delta = cell.dOut;
        x += delta[0];
        y += delta[1];        
      });
      
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
    
    App.prototype.speakWords = function(words){
      // Create a new instance of SpeechSynthesisUtterance.
      var msg = new SpeechSynthesisUtterance();
      
      // Set the text.
      msg.text = words;
      
      // Set the attributes.
      msg.volume = 1;
      msg.rate = 1;
      msg.pitch = 1;
      
      // Queue this utterance.
      window.speechSynthesis.speak(msg);
    };

    return App;

  })();

  $(function() {
    return new App(config);
  });

}).call(this);
