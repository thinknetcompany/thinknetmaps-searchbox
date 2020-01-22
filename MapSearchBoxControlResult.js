'use strict';

var resultList = function(component) {
  this.component = component;
  this.items = [];
  this.active = 0;
  this.divlist = document.createElement('div');

  // wrapper
  this.wrapper = document.createElement('div');
  this.wrapper.className = 'searchresult-wrapper';
  this.element = document.createElement('ul');
  this.element.className = 'searchresult';
  this.wrapper.appendChild(this.element);

  // pagination
  this.pagination = document.createElement('div');
  this.pagination.className = 'searchresult-pagination';

  this.showresult = document.createElement('span');
  this.showresult.className = 'showresult';
  this.showresult.innerHTML = 'Result: 1 - 4';
  this.pagination.appendChild(this.showresult);

  this.divBackNextPage = document.createElement('div');
  this.divBackNextPage.className = 'backnextpage';

  this.backIcon = this.createIcon(
    'back', 
    '<g style="" transform="matrix(0.060976, 0, 0, 0.060976, -6.187839, 0)"><g><path d="M198.608,246.104L382.664,62.04c5.068-5.056,7.856-11.816,7.856-19.024c0-7.212-2.788-13.968-7.856-19.032l-16.128-16.12 C361.476,2.792,354.712,0,347.504,0s-13.964,2.792-19.028,7.864L109.328,227.008c-5.084,5.08-7.868,11.868-7.848,19.084 c-0.02,7.248,2.76,14.028,7.848,19.112l218.944,218.932c5.064,5.072,11.82,7.864,19.032,7.864c7.208,0,13.964-2.792,19.032-7.864 l16.124-16.12c10.492-10.492,10.492-27.572,0-38.06L198.608,246.104z"/></g></g>',
    17.6,
    30
  )
  this.nextIcon = this.createIcon(
    'next', 
    '<g transform="matrix(0.060975, 0, 0, 0.060975, -6.187622, 0)" bx:origin="0 0"><g><path d="M382.678,226.804L163.73,7.86C158.666,2.792,151.906,0,144.698,0s-13.968,2.792-19.032,7.86l-16.124,16.12 c-10.492,10.504-10.492,27.576,0,38.064L293.398,245.9l-184.06,184.06c-5.064,5.068-7.86,11.824-7.86,19.028 c0,7.212,2.796,13.968,7.86,19.04l16.124,16.116c5.068,5.068,11.824,7.86,19.032,7.86s13.968-2.792,19.032-7.86L382.678,265 c5.076-5.084,7.864-11.872,7.848-19.088C390.542,238.668,387.754,231.884,382.678,226.804z"/></g></g>',
    17.6,
    30
  )
  this.backButton = document.createElement('div');
  this.backButton.className = 'mapboxgl-ctrl-geocoder--button backbutton';
  this.backButton.appendChild(this.backIcon);
  this.nextButton = document.createElement('div');
  this.nextButton.className = 'mapboxgl-ctrl-geocoder--button nextbutton';
  this.nextButton.appendChild(this.nextIcon);

  this.divBackNextPage.appendChild(this.backButton);
  this.divBackNextPage.appendChild(this.nextButton);
  this.pagination.appendChild(this.divBackNextPage);

  this.divlist.appendChild(this.wrapper);
  this.divlist.appendChild(this.pagination);

  this.backButton.addEventListener('click', function() {
    this._backPageSearchResult.call(this);
  }.bind(this));
  this.nextButton.addEventListener('click', function() {
    this._nextPageSearchResult.call(this);
  }.bind(this));

  component._inputEl.parentNode.insertBefore(this.divlist, component._inputEl.nextSibling);
  return this;
};

resultList.prototype.show = function() {
  this.divlist.style.display = 'block';
};

resultList.prototype.hide = function() {
  this.divlist.style.display = 'none';
};

resultList.prototype.add = function(item) {
  this.items.push(item);
};

resultList.prototype.clear = function() {
  this.items = [];
  this.active = 0;
};

resultList.prototype.isEmpty = function() {
  return !this.items.length;
};

resultList.prototype.draw = function() {
  this.element.innerHTML = '';
  this.element.scrollTop = 0;

  if (this.items.length === 0) {
    this.hide();
    return;
  }

  for (var i = 0; i < this.items.length; i++) {
    this.drawItem(this.items[i], i);
  }

  this.show();
};

resultList.prototype.drawItem = function(item, index) {
  var li = document.createElement('li'),
      a = document.createElement('a');

  if (index > 0) {
    li.className += ' nextrows';
  }

  a.innerHTML = item;

  li.appendChild(a);
  this.element.appendChild(li);

  li.addEventListener('mouseup', function() {
    this.handleMouseUp.call(this, index);
  }.bind(this));

  li.addEventListener('mouseover', function() {
    this.handleMouseOver.call(this, index);
  }.bind(this));

  li.addEventListener('mouseout', function() {
    this.handleMouseOut.call(this, index);
  }.bind(this));

};

resultList.prototype.handleMouseUp = function(index) {
  this.component._actionMarker('focus', index);
};
resultList.prototype.handleMouseOver = function(index) {
  this.component._actionMarker('over', index);
};
resultList.prototype.handleMouseOut = function(index) {
  this.component._actionMarker('out', index);
};

resultList.prototype.updateShowResult = function(html) {
  this.showresult.innerHTML = html;
}

resultList.prototype.backButtonActive = function(status) {
  if (status) {
    this.backIcon.classList.add('mapboxgl-ctrl-geocoder--icon-back-active');
  } else {
    this.backIcon.classList.remove('mapboxgl-ctrl-geocoder--icon-back-active');
  }
}
resultList.prototype.nextButtonActive = function(status) {
  if (status) {
    this.nextIcon.classList.add('mapboxgl-ctrl-geocoder--icon-next-active');
  } else {
    this.nextIcon.classList.remove('mapboxgl-ctrl-geocoder--icon-next-active');
  }
}

resultList.prototype._backPageSearchResult = function() {
  this.component._backPageSearchResult();
}
resultList.prototype._nextPageSearchResult = function() {
  this.component._nextPageSearchResult();
}

resultList.prototype.createIcon = function(name, path, width, height) {
  var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('class', 'mapboxgl-ctrl-geocoder--icon mapboxgl-ctrl-geocoder--icon-' + name);
  icon.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  icon.setAttribute('xml:space','preserve');
  icon.setAttribute('width', width);
  icon.setAttribute('height', height);
  icon.innerHTML = path;
  return icon;
}

module.exports = resultList;