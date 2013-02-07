//= require can.jquery-all
//= require models/local_storage
//= require models/display_prefs

(function(can, $){

can.Control("CMS.Controllers.ResizeWidgets", {
  defaults : {
    columns_token : "columns"
    , heights_token : "heights"
    , total_columns : 12
    , default_layout : null
    , page_token : window.location.pathname.substring(1, (window.location.pathname + "/").indexOf("/", 1))
  }
}, {

  setup : function(el, opts) {
    this._super && this._super.apply(this, arguments)
    var that = this;
    CMS.Models.DisplayPrefs.findAll().done(function(data) {
      var m = data[0] || new CMS.Models.DisplayPrefs();
      m.save();
      that.options.model = m;
      that.on();
    });
  }
  
  , init : function(el, newopts) {
    this._super && this._super(newopts);

    //set up dragging the bottom border to resize in jQUI
    $(this.element).find("section[id]").resizable({
      handles : "s"
      //, ghost : true
    });

    this.update(newopts);
  }

  , update : function(newopts) {
    var that = this
    , opts = this.options

    if(!(opts.model[opts.columns_token] instanceof can.Observe)) 
      opts.model.attr(opts.columns_token, new can.Observe(opts.model[opts.columns_token]));
    if(!(opts.model[opts.heights_token] instanceof can.Observe)) 
      opts.model.attr(opts.heights_token, new can.Observe(opts.model[opts.heights_token]));
    if(!(opts.model[opts.heights_token][opts.page_token] instanceof can.Observe)) 
      opts.model.attr(opts.heights_token).attr(opts.page_token, new can.Observe(opts.model[opts.heights_token][opts.page_token]));


    this.update_columns();
    this.update_heights();
    this.on();
  }

  , update_columns : function() {    
    var $c = $(this.element)
    , $children = $c.children().not(".width-selector-bar, .width-selector-drag")
    , widths = this.getWidthsForSelector($c)
    , widths
    , total_width = 0;


    widths = this.getWidthsForSelector($(this.element)) || [];

    for(var i = 0; i < widths.length; i++) {
      total_width += widths[i];
    }
    if(total_width != this.options.total_columns) {
      var scraped_cols = [];
      var scraped_col_total = 0;
      $children.each(function(i, child) {
        var classes = $(child).attr("class").split(" ");
        can.each(classes, function(_class) {
          var c;
          if(c = /^span(\d+)$/.exec(_class)) {
            scraped_cols.push(+c[1]);
            scraped_col_total += (+c[1]);
          }
        });
      });
    }

    if(!widths || $children.length != widths.length) {
      if(scraped_col_total === this.options.total_columns) {
        widths = scraped_cols;
      } else {
        widths = this.sensible_default($children.length);
      }
      this.options.model.attr(this.options.columns_token).attr($c.attr("id"), widths);
      this.options.model.save();
    }  


    for(i = 1; i <= this.options.total_columns; i++) {
      $children.removeClass("span" + i);
    }

    $children.each(function(i, child) {
      $(child).addClass("span" + widths[i]);
    });
  }

  , update_heights : function() {
    var model = this.options.model
    , heights = model.attr(this.options.heights_token)
    , page_heights = heights.attr(this.options.page_token)
    , that = this
    , dirty = false
    , $c = $(this.element).children(".widget-area");

    $c.each(function(i, child) {
      var $gc = $(child).find("section[id]");
      $gc.each(function(j, grandchild) {
        if(page_heights.attr($(grandchild).attr("id"))) {
          $(grandchild).css("height", page_heights.attr($(grandchild).attr("id")));
        } else {
          // missing a height.  redistribute evenly
          var ht = Math.floor(($(window).height() - $(child).offset().top - 10) / $gc.length);
          $gc.attr("height", ht);
          $gc.each(function(i, grandchild) {
            page_heights.attr($(grandchild).attr("id"), ht);
          });
          dirty = true;
          return false;
        }
      });
    });
    if(dirty)
     model.save();

  }

  , divide_evenly : function(n) {
    var tc = this.options.total_columns;
    var ret = [];
    while(ret.length < n) {
      ret.push(Math.floor(tc / n));
    }
    if(n % 2) {
      //odd case
      ret[Math.floor(n / 2)] += tc % (ret[0] * ret.length);
    } else {
      //even case 
      ret[n / 2 - 1] += Math.floor(tc % (ret[0] * ret.length) / 2);
      ret[n / 2] += Math.ceil(tc % (ret[0] * ret.length) / 2);
    }

    return ret;
  }

  , sensible_default : function(n) {
    switch(n) {
      case 2:
      return [5, 7];
      case 3:
      return [3, 6, 3];
      default:
      return this.divide_evenly(n);
    }

  }

  , "{model} change" : function(el, ev, attr, how, newVal, oldVal) {
    var parts = attr.split(".");
    if(parts.length > 1 && parts[0] === this.options.columns_token && parts[1] === $(this.element).attr("id")) {
      this.update_columns();
      this.options.model.save();
    }
    if(parts.length > 1 && parts[0] === this.options.heights_token && $(this.element).has("#" + parts[1])) {
      this.update_heights();
      this.options.model.save();
    }
  }

  , adjust_column : function(container, border_idx, adjustment) {
    var containers = this.options.model[this.options.columns_token];
    var col = this.getWidthsForSelector(container);
    var adjustment = this.normalizeAdjustment(col, border_idx, adjustment);

    if(!adjustment)
      return;

    col.attr(border_idx, col[border_idx] - adjustment);
    col.attr(border_idx - 1, col[border_idx - 1] + adjustment);
    this.options.model.save();
  }

  , normalizeAdjustment : function(col, border_idx, initial_adjustment) {
    var adjustment = initial_adjustment;

    if(border_idx < 1 || border_idx >= col.length) 
      return 0;

    //adjustment is +1, border_idx reduced by 1, adjustment should never be a higher number than border_idx width minus 1
    //adjustment is -1, border_idx-1 reduced by 1, adjustment should never be lower than negative( border_idx-1 width minus 1)

    adjustment = Math.min(adjustment, col[border_idx] - 1);
    adjustment = Math.max(adjustment, -col[border_idx - 1] + 1);

    return adjustment;
  }

  , getWidthsForSelector : function(sel) {
    return this.options.model.attr(this.options.columns_token).attr($(sel).attr("id"));
  }

  , getLeftOffset : function(pageX) {
    var $t = $(this.element)
      , margin = parseInt($t.children('[class*=span]:last').css('margin-left'));
    return Math.round((pageX * this.options.total_columns) / ($t.width() + margin));
  }

  , getLeftOffsetAsPixels : function(offset) {
    var $t = $(this.element)
      , margin = parseInt($t.children('[class*=span]:last').css('margin-left'));
    return offset * ($t.width() + margin) / this.options.total_columns;
  }

  , " mousedown" : "startResize"

  , startResize : function(el, ev) {
    var that = this;
    var origTarget = ev.originalEvent ? ev.originalEvent.target : ev.target;
    var $t = $(this.element);
    if ($t.is(origTarget)) {
      var offset = this.getLeftOffset(ev.pageX);
      var widths = that.getWidthsForSelector($t).slice(0);
      var c_width = that.options.total_columns;
      while(c_width > offset) { //should be >=?
        c_width -= widths.pop();
      }
      //create the bar that shows where the new split will be
      $("<div>&nbsp;</div>")
      .addClass("width-selector-bar")
      .data("offset", offset)
      .data("start_offset", offset)
      .data("index", widths.length)
      .css({
        width: "5px"
        , height : $t.height()
        , "background-color" : "black"
        , position : "fixed"
        , left : this.getLeftOffsetAsPixels(offset)
        , top : $t.offset().top - $(window).scrollTop()
      }).appendTo($t);
      //create an invisible drag target so we don't drag around a ghost of the bar
      $("<div>&nbsp;</div>")
      .attr("draggable", true)
      .addClass("width-selector-drag")
      .css({
        left : ev.pageX - $(window).scrollLeft() - 1
        , top : ev.pageY - $(window).scrollTop() - 1
        , position : "fixed"
        , width : "3px"
        , height : "3px"
        , cursor : "e-resize w-resize"
      })
      //.bind("mouseup dragend", this.proxy('completeResize', this.element))
      //.bind("dragover", this.proxy('recalculate', this.element))
      .appendTo($t);
    }
  }


  , completeResize : function(el, ev) {
    var $drag = $(".width-selector-drag");
    if($drag.length) {
      var t = this.element
      , $bar = $(".width-selector-bar")
      , offset = $bar.data("offset")
      , start_offset = $bar.data("start_offset")
      , index = $bar.data("index");

      this.adjust_column(t, index, offset - start_offset);
    }
    $(".width-selector-bar, .width-selector-drag").remove();
  }

  , " mouseup" : "completeResize"
  , " dragend" : "completeResize"

  //, " dragstart" : function(el, ev)  { ev.preventDefault(); }

  , " dragover" : "recalculateDrag"
  , recalculateDrag : function(el, ev) {
    var $drag = $(this.element).find(".width-selector-drag");
    var $bar =  $(this.element).find(".width-selector-bar")
    if($drag.length) {
      var $t = $(this.element)
      , offset = this.getLeftOffset(ev.pageX)
      , adjustment = this.normalizeAdjustment(this.getWidthsForSelector($t), $bar.data("index"), offset - $bar.data("start_offset"));

      offset = $bar.data("start_offset") + adjustment;

      $bar
      .data("offset", offset)
      .css("left", this.getLeftOffsetAsPixels(offset));
      ev.preventDefault();
    }
  }

  , " resizestop" : function(el, ev, ui) {
    this.options.model
    .attr(this.options.heights_token)
    .attr(this.options.page_token)
    .attr($(ui.element).attr("id"), ui.size.height);
  }

});

})(this.can, this.can.$);