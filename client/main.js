import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import synaptic from 'synaptic';
import SVG from 'svg.js';
import { jquery } from 'jquery';
import select2 from 'select2';

$.fn.select2.defaults.set("width", null);
$.fn.select2.defaults.set( "theme", "bootstrap" );

Inputs = new Mongo.Collection(null);
Outputs = new Mongo.Collection(null);

let network;
let draw;
let testinput;

Template.input.onRendered(function(){
  $("#input").select2({
    tags: true,
    placeholder: "Nucleotide sequence or aptamer"
  });
});

Template.output.onRendered(function(){
  $("#output").select2({
    tags: true,
    placeholder: "Nucleotide sequence or other action"
  });
});

Template.registerHelper("inputs", () => {
  return Inputs.find();
});

Template.registerHelper("outputs", () => {
  return Outputs.find();
});

Template.registerHelper("rows", () => {
  let inputsize = Inputs.find().count();
  return combinations(inputsize);
});

Template.registerHelper("inputsAndOutputs", () => {
  return Inputs.find().count() && Outputs.find().count();
});

Template.registerHelper("indexIsLast", (index, arr) => {
  return index === arr.length-1;
})


Template.container.events({
  "click #add-input": function(){
    let input = $("#input").val();
    Inputs.insert({
      name: input
    });
  },
  "click #add-output": function(){
    let output = $("#output").val();
    Outputs.insert({
      name: output
    });
  },
  "click #generate-network": function(){
    let inputsize = Inputs.find().count();
    let outputsize = Outputs.find().count();
    let inputs = combinations(inputsize);
    let outputs = getOutput();
    //let hiddenlayers = (inputsize+outputsize);
    let hiddenlayers = Math.ceil((inputsize+outputsize)/2);
    network = new synaptic.Architect.Perceptron(inputsize, hiddenlayers, outputsize);
    testinput = new Array(inputsize).fill(0);
    let trainingSet = createTrainingSet(inputs, outputs);
    network.trainer.train(trainingSet, {
    	error: .00001,
    });
    drawNetwork();
  }
});

function drawNetwork(){

  let inputs = network.layers.input.list;
  let hidden = network.layers.hidden[0].list;
  let outputs = network.layers.output.list;

  if(draw) draw.remove();
  draw = SVG('drawing').size("100%", "100%");
  let width = 300;
  let height = 100;
  let radius = 10;
  draw.viewbox(0, 0, width, height);

  drawConnections(inputs, hidden, radius, width/2);
  drawConnections(hidden, outputs, width/2, width-radius);

  drawLayer(inputs, radius, true, testinput);
  drawLayer(hidden, width/2);
  drawLayer(outputs, width-radius, false, network.activate(testinput));

  function drawLayer(layer, x, events, colors){
    layer.forEach((val, i, arr) => {
      let y = getY(arr.length, i);
      let circle = draw.circle(radius*2-1).attr({
        cx: x,
        cy: y,
        stroke: "#000",
        fill: '#000',
      });
      if(events){
        circle.attr({
          style: "cursor: pointer;",
          index: i
        })
        circle.on("click", function(){
          let index = parseInt(this.node.attributes.index.value);
          testinput[index] = testinput[index] ? 0 : 1;
          drawNetwork();
        });
      }
      if(colors){
        circle.attr({
          fill: float2color(colors[i])
        })
      }
    });
  }

  function drawConnections(layer1, layer2, x1, x2){
    layer1.forEach((val, i, arr1) => {
      layer2.forEach((val, j, arr2) => {
        let y1 = getY(arr1.length, i);
        let y2 = getY(arr2.length, j);
        draw.line(x1, y1, x2, y2).stroke({ width: 1 });
      });
    });
  }

  function getY(length, i){
    if(length === 1) return height/2;
    else return (height-2*radius)/(length-1)*i+radius;
  }
}

function float2color( percentage ) {
    var color_part_dec = 255 * percentage;
    var color_part_hex = Number(parseInt( color_part_dec , 10)).toString(16);
    return "#" + color_part_hex + color_part_hex + color_part_hex;
}

function createTrainingSet(inputs, outputs){
  let trainingSet = [];
  inputs.forEach(function(value, index){
    trainingSet.push({
      input: inputs[index],
      output: outputs[index]
    });
  });
  return trainingSet;
}

function getOutput(){
  let outputs = [];
  let numoutputs = Outputs.find().count();
  let foo = [];
  let bar = 0;
  $(".output").each(function(index){
    foo.push(parseInt($(this).val()));
    bar++;
    if(!(bar%numoutputs)){
      outputs.push(foo);
      foo = [];
    }
  }).get();
  return outputs;
}

function combinations(n) {
  var r = [];
  for(var i = 0; i < (1 << n); i++) {
    var c = [];
    for(var j = 0; j < n; j++) {
      c.push(i & (1 << j) ? 1 : 0);
    }
    r.push(c.reverse());
  }
  return r;
}
