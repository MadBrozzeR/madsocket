function Collector (steps, callback) {
  this.steps = steps;
  this.data = Buffer.alloc(0);
  this.callback = callback;

  this.currentStep = {
    index: 0,
    data: {},
    length: 0,
    id: '',
  };
}

Collector.prototype.getCurrentStepLength = function () {
  const currentStep = this.steps[this.currentStep.index];

  if (this.currentStep.id !== currentStep.id) {
    this.currentStep.id = currentStep.id;

    if (typeof currentStep.length === 'number') {
      this.currentStep.length = currentStep.length;
    } else if (currentStep.length instanceof Function) {
      this.currentStep.length = currentStep.length(this.currentStep.data);
    }
  }

  return this.currentStep.length;
}

Collector.prototype.push = function (data) {
  if (this.data) {
    this.data = Buffer.concat([this.data, data], this.data.length + data.length);
  } else {
    this.data = data;
  }

  this.process();
}

Collector.prototype.process = function () {
  const currentStep = this.steps[this.currentStep.index];
  const currentStepLength = this.getCurrentStepLength();

  if (this.data.length >= currentStepLength) {
    const slice = this.data.slice(0, currentStepLength);
    this.data = this.data.slice(currentStepLength);
    this.currentStep.data[currentStep.id] = currentStep.callback(slice, this.currentStep.data);
    this.goStepUp();
    this.process();
  }
}

Collector.prototype.goStepUp = function () {
  const nextStep = this.currentStep.index + 1;

  if (nextStep >= this.steps.length) {
    this.callback(this.currentStep.data);
    this.currentStep.data = {};
    this.currentStep.index = 0;
    this.currentStep.id = '';
  } else {
    this.currentStep.index = nextStep;
  }
}

Collector.prototype.reset = function () {
  this.currentStep.data = {};
  this.currentStep.index = 0;
  this.currentStep.id = '';
  this.data = Buffer.alloc(0);
}

module.exports = { Collector };
