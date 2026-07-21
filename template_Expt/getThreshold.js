// 此脚本是用来获取初始阈值
// 调整公式为：adjustedDifficulty = difficulty.get() + ((accuracy - targetAccuracy) / 2) * difficultyRange;
// difficulty.get() 为从上一组试次中获取的难度值，即 coherence
/*-----------------------------------------------------------

1. 被试首先需要完成一个简短的知觉判断测试（大概20个trial）;
2. 程序采用预实验3中的楼梯程序，将最后的 threshold 保存为全局变量;
3. 包含两种自适应任务：形状判断（dot_shape_ratio → window.proportion）
   和颜色判断（target_color_proportion → window.colorProportion），
   两种任务 counterbalanced 顺序执行;
4. 获取 threshold 值并传递给 shape.js 和 color.js;

可能的问题：

1. 获取的data如何传递到其他脚本;
2. 脚本加载顺序;
3. proportion/colorProportion 作为时间线变量能否改变或替换;

1221更新
- 此实验为实验2
- 形状（circle vs square）分别选取较容易和较困难的 ratio

2026更新
- 移除了运动判断，改为形状（shape）和颜色（color）两种自适应任务
- 所有点 random 方向运动（coherence: 0）

------------------------------------------------------------*/

// 初始化存储数组（easy 存储两次结果）
window.coherence = new Array(2).fill(0);
window.proportion = new Array(2).fill(0);
window.colorProportion = new Array(2).fill(0);
var testOutputs = []; 

var coherence_output ={
  shape: window.proportion,
  color: window.colorProportion,
  testOutput: []
}

var getThreshold = {
  timeline: []
};

// 形状（shape）阶梯变量
let currentCycleMunShape = 0;
let shapeStage = 0;
let index
let initial_difficulty_shape_easy = 0.7;

// 初始化保存计数（仅 easy）
const shapeSaveCounts = { easy: 0 };

// 颜色（color）阶梯变量
let currentCycleMunColor = 0;
let colorStage = 0;
let initial_difficulty_color_easy = 0.55;

// 初始化保存计数（仅 easy）
const colorSaveCounts = { easy: 0 };

// // 定义一个函数来计算索引
// function getIndex(difficultyType) {
//   const startIndices = {
//     easy: 0,
//     hard: 0
//   };
//   return startIndices[difficultyType] + saveCounts[difficultyType];
// }

var randomInteger = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
};


// 指导语
let instruction_getThreshold = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "",
  on_start: function () {
    document.body.style.backgroundColor = "black";
    this.stimulus = `
    <div style="text-align: left; color: white; padding: 10px"> 
      <h3 style="text-align: center; font-size: 30px; margin: 10px">欢迎进入实验！请仔细阅读以下文字</h3>
      <p>在正式开始前，我们将通过一个快速测试为您制定合适的难度水平。<p>
      <p>测试包含两部分：<span style="font-weight: bold">形状判断</span>和<span style="font-weight: bold">颜色判断</span>。</p>
      <p>形状判断：判断散点图中哪种形状（圆形/正方形）的数量更多；</p>
      <p>颜色判断：判断散点图中哪种颜色（红色/蓝色）的数量更多。</p>
      <p>如有疑问请向主试咨询，没有则按下空格键开始</p>
    </div>`
  },
  response_ends_trial: true,
  choices: " ",
  data: {
    part: "instruction_getThreshold",
  }
};

var instruction_taskSeparate_shape = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "",
  on_start: function () {
    document.body.style.backgroundColor = "black";
    this.stimulus = `
    <div style="text-align: left; color: white; padding: 10px"> 
      <p>现在是形状判断</p>
      <p>您需要<span style="font-weight: bold">忽略点的颜色</span>并判断哪种形状的数量更多</p >
      <p>散点图下方会显示"圆"和"方"的文字标签，请根据文字位置按对应的键</p>
        <ul>
            <li>大多数为<span style="font-weight: bold">圆形</span>，请按对应文字标签所在侧的键（左侧按<span style="font-weight: bold">"F"键</span>，右侧按<span style="font-weight: bold">"J"键</span>）</li>
            <li>大多数为<span style="font-weight: bold">正方形</span>，请按对应文字标签所在侧的键（左侧按<span style="font-weight: bold">"F"键</span>，右侧按<span style="font-weight: bold">"J"键</span>）</li>
          </ul>
      <p>您需要完成两组判断，准备好后请按空格键开始</p>
    </div>`
  },
  response_ends_trial: true,
  choices: " ",
  data: {
    part: "instruction_taskSeparate"
  }
};

var instruction_taskSeparate_color = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "",
  on_start: function () {
    document.body.style.backgroundColor = "black";
    this.stimulus = `
    <div style="text-align: left; color: white; padding: 10px"> 
      <p>现在是颜色判断</p>
      <p>您需要<span style="font-weight: bold">忽略点的形状</span>并判断哪种颜色（红色或蓝色）的数量更多</p >
      <p>散点图下方会显示"红"和"蓝"的文字标签，请根据文字位置按对应的键</p>
        <ul>
            <li>大多数为<span style="color: hsl(0, 50%, 50%)">红色</span>，请按对应文字标签所在侧的键（左侧按<span style="font-weight: bold">"F"键</span>，右侧按<span style="font-weight: bold">"J"键</span>）</li>
            <li>大多数为<span style="color: hsl(225, 50%, 50%)">蓝色</span>，请按对应文字标签所在侧的键（左侧按<span style="font-weight: bold">"F"键</span>，右侧按<span style="font-weight: bold">"J"键</span>）</li>
          </ul>
      <p>您需要完成两组判断，准备好后请按空格键开始</p>
    </div>`
  },
  response_ends_trial: true,
  choices: " ",
  data: {
    part: "instruction_taskSeparate"
  }
};

//------------------------- 注视点 --------------

var fixation = { 
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "<p style='font-size: 48px; color: white'>+</p >",
  trial_duration: 500,
  choices: "NO-KEYS",
  data: {
     part: "fixation"
  }
};


//设置难度的调整范围

// 形状Staircase（StaircaseShape1/StaircaseShape2）
const StaircaseShape1 = {
  max: 0.63,
  min: 0.70,
  difficultyType: 'easy',
  get: () => initial_difficulty_shape_easy,
  set: (value) => {
    value = parseFloat(value.toFixed(2));
    initial_difficulty_shape_easy = value;
    // 使用形状独立计数
    const index = shapeSaveCounts.easy; 
    window.proportion[index] = value;
    shapeSaveCounts.easy++; // 仅更新形状计数
    console.log('shapeProportionArray:', window.proportion);
  },
};

// 颜色Staircase（StaircaseColor1）
const StaircaseColor1 = {
  max: 0.55,
  min: 0.58,
  difficultyType: 'easy',
  get: () => initial_difficulty_color_easy,
  set: (value) => {
    value = parseFloat(value.toFixed(2));
    initial_difficulty_color_easy = value;
    const index = colorSaveCounts.easy;
    window.colorProportion[index] = value;
    colorSaveCounts.easy++;
    console.log('colorProportionArray:', window.colorProportion);
  },
};

// 正式阶段的单个 trial（形状判断）
let single_trial_shape = {
  type: jsPsychRdk,
  number_of_dots: 100,
  dot_color: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"],
  color_change_delay: 0, 
  dot_color_final: function () { return jsPsych.timelineVariable("dot_color_final") },
  target_color_proportion: 0.5,
  dot_shape_ratio: function() { return setCurrentDifficultyShape(currentCycleMunShape)},
  dot_shape: function () { return jsPsych.timelineVariable("dot_shape") },
  choices: ["f", "j"],
  correct_choice: function () { return jsPsych.timelineVariable("correct_choice") },
  dot_radius: 5,
  move_distance: 2.2,
  coherence: 0,
  coherent_direction: 0,
  aperture_width: 400,
  aperture_height: 400,
  background_color: "black",
  trial_duration: -1,
  data: {
    part: "shape_test",
    correct_response: function () { return jsPsych.timelineVariable("correct_choice") },
    data_label: 'staircase_shape',
  },
  on_start: function() {
    // 在散点图下方显示"圆"和"方"文字标签
    var displayElement = jsPsych.getDisplayElement();
    var label_left = jsPsych.timelineVariable("label_left");
    var label_right = jsPsych.timelineVariable("label_right");

    var leftDiv = document.createElement("div");
    leftDiv.textContent = label_left;
    leftDiv.style.position = "absolute";
    leftDiv.style.bottom = "20%";
    leftDiv.style.left = "30%";
    leftDiv.style.color = "white";
    leftDiv.style.fontSize = "48px";
    leftDiv.style.fontWeight = "bold";
    leftDiv.style.fontFamily = "SimHei, sans-serif";
    leftDiv.style.zIndex = "10";
    displayElement.appendChild(leftDiv);

    var rightDiv = document.createElement("div");
    rightDiv.textContent = label_right;
    rightDiv.style.position = "absolute";
    rightDiv.style.bottom = "20%";
    rightDiv.style.right = "30%";
    rightDiv.style.color = "white";
    rightDiv.style.fontSize = "48px";
    rightDiv.style.fontWeight = "bold";
    rightDiv.style.fontFamily = "SimHei, sans-serif";
    rightDiv.style.zIndex = "10";
    displayElement.appendChild(rightDiv);
  },
  on_finish: function(data){
    data.data_label = 'staircase_shape';
    data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
  }
};



// 正式阶段的单个 trial（颜色判断）
let single_trial_color = {
  type: jsPsychRdk,
  number_of_dots: 100,
  dot_color: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"],
  color_change_delay: 0,
  dot_color_final: function () { return jsPsych.timelineVariable("dot_color_final") },
  target_color_proportion: function() { return setCurrentDifficultyColor(currentCycleMunColor) },
  dot_shape: "circle",
  dot_shape_ratio: 0.5,
  choices: ["f", "j"],
  correct_choice: function () { return jsPsych.timelineVariable("correct_choice") },
  dot_radius: 5,
  move_distance: 2.2,
  coherence: 0,
  coherent_direction: 0,
  aperture_width: 400,
  aperture_height: 400,
  background_color: "black",
  trial_duration: -1,
  data: {
    part: "color_test",
    correct_response: function () { return jsPsych.timelineVariable("correct_choice") },
    data_label: 'staircase_color',
  },
  on_start: function() {
    var displayElement = jsPsych.getDisplayElement();
    var label_left = jsPsych.timelineVariable("label_left");
    var label_right = jsPsych.timelineVariable("label_right");

    var leftDiv = document.createElement("div");
    leftDiv.textContent = label_left;
    leftDiv.style.position = "absolute";
    leftDiv.style.bottom = "20%";
    leftDiv.style.left = "30%";
    leftDiv.style.color = "white";
    leftDiv.style.fontSize = "48px";
    leftDiv.style.fontWeight = "bold";
    leftDiv.style.fontFamily = "SimHei, sans-serif";
    leftDiv.style.zIndex = "10";
    displayElement.appendChild(leftDiv);

    var rightDiv = document.createElement("div");
    rightDiv.textContent = label_right;
    rightDiv.style.position = "absolute";
    rightDiv.style.bottom = "20%";
    rightDiv.style.right = "30%";
    rightDiv.style.color = "white";
    rightDiv.style.fontSize = "48px";
    rightDiv.style.fontWeight = "bold";
    rightDiv.style.fontFamily = "SimHei, sans-serif";
    rightDiv.style.zIndex = "10";
    displayElement.appendChild(rightDiv);
  },
  on_finish: function(data){
    data.data_label = 'staircase_color';
    data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
  }
};

var feedbackTrial = {
  type: jsPsychHtmlKeyboardResponse,
  trial_duration: 500,
  stimulus: function(){
    // this function will check the accuracy of the last response and use that information to set
    // the stimulus value on each trial.
    let trial_data = jsPsych.data.get().last(1).values()[0];
    let correct = trial_data.correct;
    let rt = trial_data.rt
    if(rt > 0 && rt < 250){
      return `<p style='font-size: 60px; color: yellow'>太快!</p>`; 
    } else if(rt == -1) {
      return `<p style='font-size: 60px; color: yellow'>太慢!</p>`; 
    } else if(correct){
      return `<p style='font-size: 60px; color: green'>正确!</p>`;
    } else {
      return `<p style='font-size: 60px; color: red'>错误!</p>`;
    }
  },
};

var feedback_block_shape = {
  type: jsPsychHtmlKeyboardResponse,
  trial_duration: 2000,
  stimulus: function () {
    let trials = jsPsych.data.get().filter({data_label:'staircase_shape'}).last(12);
    let task = trials.select("part").values[0];
    let correct_trials = trials.filter({correct: true });
    let accuracy = Math.round(correct_trials.count() / trials.count() * 100);
    let rt = Math.round(trials.select('rt').mean());
    let rt_sd = Math.round(trials.select('rt').sd());
    let shapeRatio = trials.select('dot_shape_ratio').mean()
    // 创建一个包含条件和结果的对象
    testOutput = {
      condition: {
        "task": task,
        "shapeRatio": shapeRatio
      },
      result: {
        "accuracy": accuracy,
        "rt": rt,
        "rt_sd": rt_sd
      }
    };
    // 将 testOutput 添加到 coherence_output 中
    coherence_output.testOutput.push(testOutput);
    
    console.log(testOutput)
    return `<p style='font-size: 35px; color: white'>您的正确率为： ${accuracy}% 。平均反应时为：${rt}毫秒。</p>`; 
  },
};

var feedback_block_color = {
  type: jsPsychHtmlKeyboardResponse,
  trial_duration: 2000,
  stimulus: function () {
    let trials = jsPsych.data.get().filter({data_label:'staircase_color'}).last(12);
    let task = trials.select("part").values[0];
    let correct_trials = trials.filter({correct: true });
    let accuracy = Math.round(correct_trials.count() / trials.count() * 100);
    let rt = Math.round(trials.select('rt').mean());
    let rt_sd = Math.round(trials.select('rt').sd());
    let colorRatio = trials.select('target_color_proportion').mean()
    testOutput = {
      condition: {
        "task": task,
        "colorRatio": colorRatio
      },
      result: {
        "accuracy": accuracy,
        "rt": rt,
        "rt_sd": rt_sd
      }
    };
    coherence_output.testOutput.push(testOutput);
    console.log(testOutput)
    return `<p style='font-size: 35px; color: white'>您的正确率为： ${accuracy}% 。平均反应时为：${rt}毫秒。</p>`; 
  },
};

//设置循环的时间线（形状判断）
let cycle_rdk_shape = {
  timeline: [fixation, single_trial_shape, feedbackTrial],
  timeline_variables: [
    // circle majority, "圆" in left → F
    { dot_shape: "circle", dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], correct_choice: "f", label_left: "圆", label_right: "方" },
    // square majority, "方" in left → F
    { dot_shape: "square", dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], correct_choice: "f", label_left: "方", label_right: "圆" },
    // circle majority, "圆" in right → J
    { dot_shape: "circle", dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], correct_choice: "j", label_left: "方", label_right: "圆" },
    // square majority, "方" in right → J
    { dot_shape: "square", dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], correct_choice: "j", label_left: "圆", label_right: "方" }
  ],
  repetitions: 3,
  randomize_order: true
};

// 加上 block 反馈的时间线（形状）
let cycle_shape = {
  timeline: [cycle_rdk_shape, feedback_block_shape],
  on_timeline_finish: function() {
    currentCycleMunShape += 1;
    if(currentCycleMunShape %2 != 0 ){ // 每种条件下循环2次
      shapeStage += 1;
    } else {
      shapeStage = shapeStage
    }
    console.log('current condition number ', shapeStage)
  }
};

//设置循环的时间线（颜色判断）
let cycle_rdk_color = {
  timeline: [fixation, single_trial_color, feedbackTrial],
  timeline_variables: [
    // red majority, "红" in left → F
    { dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], correct_choice: "f", label_left: "红", label_right: "蓝" },
    // blue majority, "蓝" in left → F
    { dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], correct_choice: "f", label_left: "蓝", label_right: "红" },
    // red majority, "红" in right → J
    { dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], correct_choice: "j", label_left: "蓝", label_right: "红" },
    // blue majority, "蓝" in right → J
    { dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], correct_choice: "j", label_left: "红", label_right: "蓝" }
  ],
  repetitions: 3,
  randomize_order: true
};

// 加上 block 反馈的时间线（颜色）
let cycle_color = {
  timeline: [cycle_rdk_color, feedback_block_color],
  on_timeline_finish: function() {
    currentCycleMunColor += 1;
    if(currentCycleMunColor %2 != 0 ){
      colorStage += 1;
    } else {
      colorStage = colorStage
    }
    console.log('current color condition number ', colorStage)
  }
};

// generateStaircaseTimeline 为外部调用的函数，用于生成测试阶段的 staircase
let shape_easy = generateStaircaseTimeline({
  jsPsychInstance: jsPsych,
  targetAccuracy: 0.85,
  numberOfCycles: 1,
  difficulty: StaircaseShape1,
  dataLabel: 'staircase_shape',
  cycle: cycle_shape,
});

let color_easy = generateStaircaseTimeline({
  jsPsychInstance: jsPsych,
  targetAccuracy: 0.85,
  numberOfCycles: 1,
  difficulty: StaircaseColor1,
  dataLabel: 'staircase_color',
  cycle: cycle_color,
});

// 仅 easy 水平，运行2次取收敛值
function setCurrentDifficultyShape(currentCycleMunShape) {
  return StaircaseShape1.get();
}

function setCurrentDifficultyColor(currentCycleMunColor) {
  return StaircaseColor1.get();
}

let full_block_shape = {
  timeline: [shape_easy, shape_easy]
};

let full_block_color = {
  timeline: [color_easy, color_easy]
};

// 根据被试编号组别分配（形状 + 颜色，counterbalanced）
// userId 偶数 → shape first; userId 奇数 → color first
var group_shape_first = {
  timeline: [instruction_taskSeparate_shape, full_block_shape, instruction_taskSeparate_color, full_block_color],
  conditional_function: function () {
    if (window.userId % 2 === 0) {
      console.log("shape first in threshold");
      return true;
    } else {
      return false;
    }
  }
};

var group_color_first = {
  timeline: [instruction_taskSeparate_color, full_block_color, instruction_taskSeparate_shape, full_block_shape],
  conditional_function: function () {
    if (window.userId % 2 !== 0) {
      console.log("color first in threshold");
      return true;
    } else {
      return false;
    }
  }
};

var staircase_assign_group = {
  timeline: [group_shape_first, group_color_first]
};

getThreshold = {
  timeline: [instruction_getThreshold, staircase_assign_group]
};