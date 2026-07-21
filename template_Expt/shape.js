/*---------------------------------------------------------------------------------
这段代码主要用于执行形状条件下的实验，即人物标签与形状（圆形/正方形）匹配，之后进行散点群整体形状判断
在当前的版本中，人物改为 “我”，“他/她”
并且，标签会分别于 4 种不同难度水平的散点图进行匹配
不同的难度条件随机呈现
匹配任务：3*8 个练习 trial，2 * 16 * 4 = 128 个正式 trial 
随机动点任务：2*8 = 16 个练习 trial，4 * 8 * 4 = 128 个正式 trial 每种条件40个trial
- 更新：每种条件32个trial
- 匹配任务：4*8=32个练习，24*8=192个正式/4 block
- 随机动点任务：
 - 形状：4*4=16个练习，24*4=96正式/3 block
 - 颜色：4*4=16个练习，24*4=96正式/3 block
-----------------------------------------------------------------------------------*/

var randomInteger = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
};

// Fisher-Yates shuffle：从完整条件数组中随机抽取 n 个 trial（不重复）
function createPracticeSet(fullArray, n) {
  var shuffled = fullArray.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled.slice(0, n);
}

var shape = {
  timeline: []
};

let textMun;

let labelVar = "";

var currentBlock = 0

// 条件生成器：将 base condition 扩展为两种标签位置变体，使用 F/J 键
function generateDiscriminationConditions(baseTrials, labelMap) {
  // labelMap: { correctValue: [labelForCorrect, labelForOther] }
  // 例如 motion: { "left": ["左", "右"], "right": ["左", "右"] }
  // 例如 overlap: { "self": ["我", "他"], "other": ["我", "他"] }
  var result = [];
  baseTrials.forEach(function(trial) {
    var labels = labelMap[trial.correct_value];
    if (!labels) {
      console.error("No label mapping for", trial.correct_value);
      return;
    }
    // Variant 1: 正确答案标签在左边 → 按 F
    result.push(Object.assign({}, trial, {
      label_left: labels[0],
      label_right: labels[1],
      correct_choice: "f"
    }));
    // Variant 2: 正确答案标签在右边 → 按 J
    result.push(Object.assign({}, trial, {
      label_left: labels[1],
      label_right: labels[0],
      correct_choice: "j"
    }));
  });
  return result;
}

// 生成器：在形状辨别条件上正交增加颜色维度难度（2种颜色组合，仅 easy）
function addColorDifficulty(baseTrials) {
  var result = [];
  baseTrials.forEach(function(trial) {
    // color easy, red majority
    result.push(Object.assign({}, trial, {
      target_color_proportion: 0.59,
      dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"]
    }));
    // color easy, blue majority
    result.push(Object.assign({}, trial, {
      target_color_proportion: 0.59,
      dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"]
    }));
  });
  return result;
}

// 生成器：在颜色辨别条件上正交增加形状维度难度（2种形状组合，仅 easy）
// shapeToSelf: 若提供，则根据 dot_shape 设置 association（"circle"=self 或 "square"=self）
function addShapeDifficulty(baseTrials, shapeToSelf) {
  var result = [];
  var shapeVariants = [
    { dot_shape_ratio: 0.59, dot_shape: "circle" },
    { dot_shape_ratio: 0.59, dot_shape: "square" }
  ];
  baseTrials.forEach(function(trial) {
    shapeVariants.forEach(function(variant) {
      var newTrial = Object.assign({}, trial, variant);
      if (shapeToSelf !== undefined) {
        newTrial.association = (variant.dot_shape === shapeToSelf) ? "self" : "other";
      }
      result.push(newTrial);
    });
  });
  return result;
}

// 定义一个函数来处理条件匹配和更新coherence值（仅 easy）
function updateCoherence(arr) {
  for (let i in arr) {
    const coherence = arr[i].coherence;
    const proportion = arr[i].target_color_proportion;
    switch (coherence) {
      case 0.20:
        arr[i].coherence = window.coherence[1];
        break;
    }
    switch (proportion) {
      case 0.59:
        arr[i].target_color_proportion = window.colorProportion[1];
        break;
    }
    // 更新 shape 比例（如果存在）
    if (arr[i].hasOwnProperty('dot_shape_ratio')) {
      const shapeRatio = arr[i].dot_shape_ratio;
      switch (shapeRatio) {
        case 0.59:
          arr[i].dot_shape_ratio = window.proportion[1];
          break;
      }
    }
  }
}


//--------------------知觉匹配任务------------------------

//包含：指导语，示例，练习和正式任务

// 指导语（关联学习）
var instruction_match = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "",
  on_start: function() {
    if (window.subjSex) { 
      if (window.subjSex == "男") {
        labelVar = "他";
      } else if (window.subjSex == "女") {
        labelVar = "她";
      }
    } else {
      labelVar = "TA";
    };
    document.body.style.backgroundColor = "black";
    if (userId % 2 === 0) {
      this.stimulus =  `
      <div style="text-align: left; color: white; padding: 10px"> 
        <h3 style="text-align: center; font-size: 30px; margin: 10px;">学习阶段</h3>
        <p>接下来，屏幕上会呈现一些运动的彩色圆点和正方形，</p>
        <p>其中一定比例为<span style="font-weight: bold">圆形</span>，其余为<span style="font-weight: bold">正方形</span>。</p>
        <p>如果大多数点的形状为<span style="font-weight: bold">圆形</span>代表<span style="font-weight: bold">你自己</span>，为<span style="font-weight: bold">正方形</span>代表<span style="font-weight: bold">他人</span>。</p >
        <p>同时散点图的下方会出现 "我" 或 "${labelVar}" 的文字标签。</p >
        <p>您需要判断 <span style="font-weight: bold">散点图的主要形状与文字是否匹配</span> ：</p >
        <ul>
          <li><span style="color: hsl(135, 50%, 50%)">匹配</span>，请按键盘 <span style="color: hsl(135, 50%, 50%)">"F" 键</span></li>
          <li><span style="color: red">不匹配</span>，请按键盘 <span style="color: red">"J" 键</span> </li>
        </ul>
        <p style="font-weight: bold">请尽可能又快又准地做出反应</p >
      </div>`;
    } else {
      this.stimulus =  `
      <div style="text-align: left; color: white; padding: 10px"> 
        <h3 style="text-align: center; font-size: 30px; margin: 10px">学习阶段</h3>
        <p>接下来，屏幕上会呈现一些运动的彩色圆点和正方形，</p>
        <p>如果大多数点的形状为<span style="font-weight: bold">正方形</span>代表<span style="font-weight: bold">你自己</span>，为<span style="font-weight: bold">圆形</span>代表<span style="font-weight: bold">他人</span>。</p >
        <p>同时散点图的下方会出现 "我" 或 "${labelVar}" 的文字标签。</p >
        <p>您需要判断 <span style="font-weight: bold">散点图的主要形状与文字是否匹配</span> ：</p >
        <ul>
          <li><span style="color: hsl(135, 50%, 50%)">匹配</span>，请按键盘 <span style="color: hsl(135, 50%, 50%)">"F" 键</span></li>
          <li><span style="color: red">不匹配</span>，请按键盘 <span style="color: red">"J" 键</span> </li>
        </ul>
        <p style="font-weight: bold">请尽可能又快又准地做出反应</p >
      </div>`;
    }
  },
  response_ends_trial: true,
  choices: " ",
  data: {
    part: "instruction_match", 
  },
  on_finish: function() {
    console.log("subjSexTest:", window.subjSex, "lable:", labelVar)
    if (testMode) {
      textMun = true
    } else {
      textMun = false
    }
    return textMun
  }
};

shape.timeline.push(instruction_match);

// 练习

var instruction_match_practice = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "",
  on_start: function() {
    if (userId % 2 === 0) {
      this.stimulus =  `
      <div style="text-align: left; color: white; padding: 10px">  
        <h3 style="text-align: center; font-size: 30px; margin: 10px;">学习阶段</h3>
        <p>大多数点为<span style="font-weight: bold">圆形</span>代表<span style="font-weight: bold">你自己</span>，为<span style="font-weight: bold">正方形</span>代表<span style="font-weight: bold">他人</span>。</p >
        <p>您需要判断 <span style="font-weight: bold">散点图的主要形状与文字是否匹配</span>，<span style="color: hsl(135, 50%, 50%);">匹配</span> 按 <span style="color: hsl(135, 50%, 50%);">"F" 键</span>；<span style="color: red;">不匹配</span> 按 <span style="color: red;">"J" 键</span></p >
        <p>正确率达到 90% 及以上才能进入正式任务 </p >
        <p>请把左手食指放在 "F" 键上，右手食指放在 "J" 键上</p >
        <p>请按下空格键开始练习</p >
      </div>`;
    } else {
      this.stimulus =  `
      <div style="text-align: left; color: white; padding: 10px">  
        <h3 style="text-align: center; font-size: 30px; margin: 10px;">学习阶段</h3>
        <p>大多数点为<span style="font-weight: bold">正方形</span>代表<span style="font-weight: bold">你自己</span>，为<span style="font-weight: bold">圆形</span>代表<span style="font-weight: bold">他人</span>。</p >
        <p>您需要判断 <span style="font-weight: bold">散点图的主要形状与文字是否匹配</span>，<span style="color: hsl(135, 50%, 50%);">匹配</span> 按 <span style="color: hsl(135, 50%, 50%);">"F" 键</span>；<span style="color: red;">不匹配</span> 按 <span style="color: red;">"J" 键</span></p >
        <p>正确率达到 90% 及以上才能进入正式任务 </p >
        <p>请把左手食指放在 "F" 键上，右手食指放在 "J" 键上</p >
        <p>请按下空格键开始练习</p >
      </div>`;
    }
  },
  response_ends_trial: true,
  choices: " ",
  data: {
    part: "instruction_match_practice", 
  }
};

//shape.timeline.push(instruction_practice);

fixation = { 
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "<p style='font-size: 48px; color: white'>+</p >",
  trial_duration: 500,
  choices: "NO-KEYS",
  data: {
     part: "fixation"
  }
};

//匹配判断任务的不同条件（形状关联）
// subjectId 为偶数：大多数为圆形 = 自我，大多数为正方形 = 他人
// subjectId 为奇数：大多数为正方形 = 自我，大多数为圆形 = 他人
// 2 种不同的难度 * 2 种关联类型 * 2 种匹配类型 = 8种条件

let conditions_match_selfLeft = [
  // easy only (删除 hard 水平)
  { dot_shape_ratio: 0.59, dot_shape: "circle", label: "我", correct_choice: "f", isMatch: "match", association: "self", difficulty: "easy" },
  { dot_shape_ratio: 0.59, dot_shape: "circle", label: "他", correct_choice: "j", isMatch: "mismatch", association: "self", difficulty: "easy" },
  { dot_shape_ratio: 0.59, dot_shape: "square", label: "他", correct_choice: "f", isMatch: "match", association: "other", difficulty: "easy" },
  { dot_shape_ratio: 0.59, dot_shape: "square", label: "我", correct_choice: "j", isMatch: "mismatch", association: "other", difficulty: "easy" }
];

let conditions_match_selfRight = [
  // easy only
  { dot_shape_ratio: 0.59, dot_shape: "square", label: "我", correct_choice: "f", isMatch: "match", association: "self", difficulty: "easy" },
  { dot_shape_ratio: 0.59, dot_shape: "square", label: "他", correct_choice: "j", isMatch: "mismatch", association: "self", difficulty: "easy" },
  { dot_shape_ratio: 0.59, dot_shape: "circle", label: "他", correct_choice: "f", isMatch: "match", association: "other", difficulty: "easy" },
  { dot_shape_ratio: 0.59, dot_shape: "circle", label: "我", correct_choice: "j", isMatch: "mismatch", association: "other", difficulty: "easy" }
];

// 设置匹配任务的主要刺激（形状关联）

var match_RDK = {
  type: jsPsychRdk,
  canvas_height: 600,
  number_of_apertures: 1,
  number_of_dots: 100,
  dot_color: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"],
  dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"],
  target_color_proportion: 0.5,
  dot_shape_ratio: function () { return jsPsych.timelineVariable("dot_shape_ratio") },
  dot_shape: function () { return jsPsych.timelineVariable("dot_shape") },
  choices: ["f", "j"],
  correct_choice: function () {return jsPsych.timelineVariable("correct_choice")}, 
  coherent_direction: 0,
  coherence: 0,
  dot_radius: 5, 
  move_distance: 2.2, 
  aperture_width: 400,
  aperture_height: 400,
  // aperture_center_x: 960,
  aperture_center_y: 300, //越小越往上
  background_color: "black",
  trial_duration: -1,
  data: {
    part: "match_RDK",
    task: "response",
    difficulty: function () { return jsPsych.timelineVariable("difficulty") },
    isMatch: function () { return jsPsych.timelineVariable("isMatch") },
    association: function () { return jsPsych.timelineVariable("association") },
    label: function () { return jsPsych.timelineVariable("label") },
    dot_shape_ratio: function () { return jsPsych.timelineVariable("dot_shape_ratio") },
    dot_shape: function () { return jsPsych.timelineVariable("dot_shape") },
  },
  on_start: function() {

    // 替换所有 label 为"他"的元素为性别对应称呼
    for (let i = 0; i < conditions_match_selfLeft.length; i++) {
      if (conditions_match_selfLeft[i].label === "他") {
        conditions_match_selfLeft[i].label = `${labelVar}`;
      }
      if (conditions_match_selfRight[i].label === "他") {
        conditions_match_selfRight[i].label = `${labelVar}`;
      }
    };

    // 更新 shape ratio 值（从阈值测试结果中获取）
    updateCoherence(conditions_match_selfLeft);
    updateCoherence(conditions_match_selfRight);
    
    var displayElement = jsPsych.getDisplayElement();
    
    //创建注视点
    var textDiv = document.createElement("div");
    textDiv.textContent = "+",

    textDiv.style.position = "absolute";
    textDiv.style.fontSize = "48px";
    textDiv.style.top = "50%";          // 从顶部50%位置开始
    textDiv.style.left = "50%";         // 从左侧50%位置开始
    textDiv.style.transform = "translate(-50%, -50%)"; 
    textDiv.style.color = "white";
    displayElement.appendChild(textDiv);


    //创建图片标签
    var img = document.createElement("img");
    // 根据label变量选择图片路径
    const label = jsPsych.timelineVariable("label");
    img.src = (() => {
      switch(jsPsych.timelineVariable("label")) {
        case "我": return "img/self.png";
        case "他": return "img/he.png";    // 男性他人
        case "她": return "img/she.png";  // 女性他人
        default: console.error("未知标签");
      }
    })();
    
    // // 图片样式设置
    // img.style.position = "absolute";
    // img.style.width = "135px";  // 根据实际图片尺寸调整
    // img.style.height = "auto";
    // img.style.bottom = "20%";   // 微调位置
    // img.style.left = "50%";
    // img.style.transform = "translateX(-50%)";  // 水平居中
    // img.style.objectFit = "contain";
    
    // // 添加ID便于后续操作
    // img.id = "label-image";
    // displayElement.appendChild(img);

    // 在散点图下方显示人物标签文字（与匹配任务说明一致）
    var labelText = document.createElement("div");
    labelText.textContent = jsPsych.timelineVariable("label");
    labelText.style.position = "absolute";
    labelText.style.bottom = "30%";
    labelText.style.left = "50%";
    labelText.style.transform = "translateX(-50%)";
    labelText.style.color = "white";
    labelText.style.fontSize = "48px";
    labelText.style.fontWeight = "bold";
    labelText.style.fontFamily = "SimHei, sans-serif";
    labelText.style.zIndex = "10";
    displayElement.appendChild(labelText);

    // 1000毫秒后隐藏刺激
    /*setTimeout(function() {
      var elements = displayElement.querySelectorAll("*");
      elements.forEach(function(el) {
        el.style.display = 'none';
      });
    }, 3000);*/
  },
  on_finish: function(data){
    data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_choice);
    console.log('current coherence ', data.coherence)
  },
};

//练习阶段每个试次的反馈

var feedbackTrial = {
  type: jsPsychHtmlKeyboardResponse,
  trial_duration: 500,
  stimulus: function(){
    // this function will check the accuracy of the last response and use that information to set
    // the stimulus value on each trial.
    var trial_data = jsPsych.data.get().last(1).values()[0];
    var correct = trial_data.correct;
    var rt = trial_data.rt
    if(rt > 0 && rt < 250){
      return `<p style='font-size: 60px; color: yellow'>太快!</p>`; 
    } else if(rt > 3000) {
      return `<p style='font-size: 60px; color: yellow'>太慢!</p>`; 
    } else if(correct){
      return `<p style='font-size: 60px; color: green'>正确!</p>`;
    } else {
      return `<p style='font-size: 60px; color: red'>错误!</p>`;
    }
  },
};

//匹配任务的每trial反馈（去掉"太慢"提醒）
var feedbackTrial_match = {
  type: jsPsychHtmlKeyboardResponse,
  trial_duration: 500,
  stimulus: function(){
    var trial_data = jsPsych.data.get().last(1).values()[0];
    var correct = trial_data.correct;
    var rt = trial_data.rt
    if(rt > 0 && rt < 250){
      return `<p style='font-size: 60px; color: yellow'>太快!</p>`; 
    } else if(correct){
      return `<p style='font-size: 60px; color: green'>正确!</p>`;
    } else {
      return `<p style='font-size: 60px; color: red'>错误!</p>`;
    }
  },
};

//计算整个练习阶段的总体正确率
//计算 32 个试次的反应数，挑出正确的试次数，计算准确率 
//如果整体正确率未达到 90%，告知被试继续下一轮测试

var instruction_retry_block = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: function() {
    return `
    <div style="text-align: center; color: white; padding: 30px; font-size: 30px">
      <p>您的正确率未达到 90% ，不能进入下一阶段</p>
      <p>请继续学习</p>
      <p>请按空格键继续</p>
    </div>`;
  },
  response_ends_trial: true,
  choices: " ",
  on_start: function() {
    document.body.style.backgroundColor = "black";
  },
  data: {
    part: "instruction_retry_block"
  },
};

//如果达到70%及以上，则结束练习

var instruction_practiceEnd = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
  <div style="text-align: center; color: white; padding: 30px; font-size: 30px">
    <p>恭喜您完成学习，请按空格键进入正式任务</p >
  </div>
  `,
  response_ends_trial: true,
  choices: " ",
  on_finish: function () {
    document.body.style.backgroundColor = "black";
  },
  data: {
    part: "instruction_practiceEnd"
  },
};

//========== 匹配练习（Block1无要求 + Block2需90%，最多5个block） ==========
// 每次 loop 只跑 1 个 block（48 trials），由 loop_function 控制流程
var match_pract_block = 0;
var match_pract_retries = 0;

// Block1→Block2 过渡提示屏：告知被试进入下一个 block 且有正确率要求
var instruction_block2_enter = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
  <div style="text-align: left; color: white; padding: 10px; font-size: 26px">
    <p>第一组已完成！</p>
    <p>即将进入下一组</p>
    <p style="color: hsl(50, 80%, 60%); font-weight: bold;">注意：从本组测试开始，正确率需达到 90% 及以上才能进入后面的正式任务</p>
    <p>请按空格键继续</p>
  </div>
  `,
  response_ends_trial: true,
  choices: " ",
  on_start: function() {
    document.body.style.backgroundColor = "black";
  },
  data: {
    part: "instruction_block2_enter"
  },
};

var practice_block_selfLeft = {
  timeline: [
    // 指导语移到循环外面，确保只显示一次且不影响循环内 trial 的执行
    instruction_match_practice,
    {
      timeline: [
        // 1个block的trial（48 trials）
        {
          timeline: [fixation, match_RDK, feedbackTrial_match],
          timeline_variables: conditions_match_selfLeft,
          repetitions: 12,
          randomize_order: true
        },
        // Block1 完成后显示过渡提示（match_pract_block 在 loop_function 中才递增，故此时仍为 0）
        {
          timeline: [instruction_block2_enter],
          conditional_function: function() { return match_pract_block === 0; }
        },
        // Block 2+ 完成后：达标显示完成提示，失败显示重试提示（继续下一轮）
        {
          timeline: [instruction_practiceEnd],
          conditional_function: function() {
            if (match_pract_block < 1) return false;
            var trials = jsPsych.data.get().filter({task: 'response'}).last(48);
            var correct_trials = trials.filter({correct: true});
            return Math.round(correct_trials.count() / trials.count() * 100) >= window.pract_pass_rate;
          }
        },
        {
          timeline: [instruction_retry_block],
          conditional_function: function() {
            if (match_pract_block < 1) return false;
            var trials = jsPsych.data.get().filter({task: 'response'}).last(48);
            var correct_trials = trials.filter({correct: true});
            return Math.round(correct_trials.count() / trials.count() * 100) < window.pract_pass_rate;
          }
        },
      ],
      loop_function: function () {
        match_pract_block++;
        if (match_pract_block === 1) {
          // Block1 刚完成 → 继续到 Block 2
          return true;
        }
        // Block 2+ 完成，检查正确率
        var trials = jsPsych.data.get().filter({task: 'response'}).last(48);
        var correct_trials = trials.filter({correct: true});
        var accuracy = Math.round(correct_trials.count() / trials.count() * 100);
        console.log("[match_practice] Block", match_pract_block, "accuracy:", accuracy);
        if (accuracy >= window.pract_pass_rate) {
          return false;
        }
        // 未达标
        match_pract_retries++;
        if (match_pract_retries >= 4) {
          alert("多次尝试后仍未达到90%的正确率，请联系主试。");
          return false;
        }
        return true;
      },
    }
  ],
};

var practice_block_selfRight = {
  timeline: [
    instruction_match_practice,
    {
      timeline: [
        {
          timeline: [fixation, match_RDK, feedbackTrial_match],
          timeline_variables: conditions_match_selfRight,
          repetitions: 12,
          randomize_order: true
        },
        {
          timeline: [instruction_block2_enter],
          conditional_function: function() { return match_pract_block === 0; }
        },
        {
          timeline: [instruction_practiceEnd],
          conditional_function: function() {
            if (match_pract_block < 1) return false;
            var trials = jsPsych.data.get().filter({task: 'response'}).last(48);
            var correct_trials = trials.filter({correct: true});
            return Math.round(correct_trials.count() / trials.count() * 100) >= window.pract_pass_rate;
          }
        },
        {
          timeline: [instruction_retry_block],
          conditional_function: function() {
            if (match_pract_block < 1) return false;
            var trials = jsPsych.data.get().filter({task: 'response'}).last(48);
            var correct_trials = trials.filter({correct: true});
            return Math.round(correct_trials.count() / trials.count() * 100) < window.pract_pass_rate;
          }
        },
      ],
      loop_function: function () {
        match_pract_block++;
        if (match_pract_block === 1) return true;
        var trials = jsPsych.data.get().filter({task: 'response'}).last(48);
        var correct_trials = trials.filter({correct: true});
        var accuracy = Math.round(correct_trials.count() / trials.count() * 100);
        console.log("[match_practice] Block", match_pract_block, "accuracy:", accuracy);
        if (accuracy >= window.pract_pass_rate) return false;
        match_pract_retries++;
        if (match_pract_retries >= 4) {
          alert("多次尝试后仍未达到90%的正确率，请联系主试。");
          return false;
        }
        return true;
      },
    }
  ],
};

var practice_selfLeft = {
  timeline: [practice_block_selfLeft],
  conditional_function: function(){
    if (userId % 2 === 0) {
      console.log("match_selfLeft");
      return true;
    } else {
      return false;
    }
  }
};

var practice_selfRight = {
  timeline: [practice_block_selfRight],
  conditional_function: function(){
    if (userId % 2 !== 0) {
      console.log("match_selfRight");
      return true;
    } else {
      return false;
    }
  }
};

var practice_match = { 
  timeline: [practice_selfLeft, practice_selfRight]
};

shape.timeline.push(practice_match);

//--------正式关联学习已移除（只保留练习阶段）--------

var rest_rdk = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: function() {
    return `
      <div style="text-align: center; color: white; padding: 35px; font-size: 35px">
        <p>恭喜您，已完成 ${currentBlock + 1}/2</p>
        <p>请先休息 <span id="countdown" style="color:red; font-weight:bold;">30</span> 秒</p>
        <p id="spaceTip" style="margin-top:20px; opacity:0.5;">休息结束后可按空格键继续</p>
      </div>
    `;
  },
  response_ends_trial: false, // 强制休息，期间按键无效
  choices: " ", // 只允许空格
  trial_duration: null,

  // 块数 +1
  on_start: function() {
    currentBlock += 1;
  },

  on_load: function() {
    let restTime = 30;
    const countdownDom = document.getElementById('countdown');
    const spaceTipDom = document.getElementById('spaceTip');
    const trial = this;

    // 倒计时定时器
    const timer = setInterval(() => {
      restTime -= 1;
      countdownDom.textContent = restTime;

      if (restTime <= 0) {
        clearInterval(timer);
        trial.response_ends_trial = true; // 时间到，允许按键继续
        spaceTipDom.style.opacity = "1";
        spaceTipDom.style.color = "#32cd32";
      }
    }, 1000);
  },

  on_finish: function() {
    document.body.style.backgroundColor = "black";
  },
  data: { part: "instruction_rest" }
};

/*----------关联学习结束！下面是 RDK 辨别任务-----------*/


//指导语(包含开始，练习和结束)

var instruction_RDK_beginning = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div style="text-align: left; color: white; padding: 10px"> 
      <h3 style="text-align: center; font-size: 30px; margin: 10px">接下来是：形状判断任务</h3>
      <p>屏幕上会呈现一些彩色圆点，其中一定比例的点为 <span style="font-weight: bold">圆形</span>，其余为 <span style="font-weight: bold">正方形</span>，</p>
      <p>您需要判断 <span style="font-weight: bold">散点图中哪种形状的数量更多</span></p >
      <p>散点图下方会显示"圆"和"方"的文字标签，</p>
      <ul>
        <li>若大多数为 <span style="font-weight: bold">圆形</span>，请按对应文字标签所在侧的键（左侧按 <span style="font-weight: bold">F</span>，右侧按 <span style="font-weight: bold">J</span>）</li>
        <li>若大多数为 <span style="font-weight: bold">正方形</span>，请按对应文字标签所在侧的键（左侧按 <span style="font-weight: bold">F</span>，右侧按 <span style="font-weight: bold">J</span>）</li>
      </ul>
      <p>请按下空格键进入练习阶段</p>
    </div>`,
  response_ends_trial: true,
  choices: " ",
  on_start: function() {
    currentBlock = 0
  },
  data: {
    part: "instruction_RDK_beginning", 
  }
};

//下面这些指导语会在后面 push

var instruction_RDK_practice = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
  <div style="text-align: center; color: white; padding: 35px; font-size: 30px">
    <p>请把左手食指放在键盘 <span style="font-weight: bold">"F"键</span> 上，右手食指放在 <span style="font-weight: bold">"J"键</span> 上</p >
    <p>请按下空格键进入【练习阶段】</p >
  </div>
  `,
  response_ends_trial: true,
  choices: " ",
  on_finish: function() {
    document.body.style.backgroundColor = "black";
  },
  data: {
    part: "instruction_RDK_practice"
  }
};

var instruction_RDK_practice_end = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
  <div style="text-align: center; color: white; padding: 30px; font-size: 30px">
    <p>练习结束！</p >
    <p>继续练习请按 "Q" 键 </p>
    <p>进入正式实验请按空格键, 正式实验仅在每组测试结束后提供反馈</p>
    <p style="font-weight: bold">请尽可能又快又准地做出反应</p >
  </div>
  `,
  response_ends_trial: true,
  choices: ["q", " "],
  on_finish: function () {
    document.body.style.backgroundColor = "black";
  },
  data: {
    part: "instruction_RDK_practice_end"
  },
};

var instruction_RDK_formal_beginning = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
  <div style="text-align: center; color: white; padding: 35px; font-size: 30px">
    <p>请把左手食指放在键盘 <span style="font-weight: bold">"F"键</span> 上，右手食指放在 <span style="font-weight: bold">"J"键</span> 上</p >
    <p>请按下空格键开始【正式实验】</p >
  </div>
  `,
  response_ends_trial: true,
  choices: " ",
  on_finish: function() {
    document.body.style.backgroundColor = "black";
  },
  data: {
    part: "instruction_RDk_formal_beginning"
  }
};


// 形状辨别任务基础条件（任务相关），由生成器扩展
// selfLeft（userId偶数）：大多数点为圆形=自我，大多数点为正方形=他人
// 核心条件（仅目标维度=形状），通过 addColorDifficulty 正交增加颜色维度难度
var base_shape_selfLeft_core = [
  // easy only
  { dot_shape_ratio: 0.59, dot_shape: "circle", difficulty: "easy", association: "self",correct_value: "circle", task_type: "relevant", data_part: "RDK_shape" },
  { dot_shape_ratio: 0.59, dot_shape: "square", difficulty: "easy", association: "other",correct_value: "square", task_type: "relevant", data_part: "RDK_shape" }
];
var base_shape_selfLeft = addColorDifficulty(base_shape_selfLeft_core);

// selfRight（userId奇数）：大多数点为正方形=自我，大多数点为圆形=他人
var base_shape_selfRight_core = [
  // easy only
  { dot_shape_ratio: 0.59, dot_shape: "square", difficulty: "easy", association: "self",correct_value: "square", task_type: "relevant", data_part: "RDK_shape" },
  { dot_shape_ratio: 0.59, dot_shape: "circle", difficulty: "easy", association: "other",correct_value: "circle", task_type: "relevant", data_part: "RDK_shape" }
];
var base_shape_selfRight = addColorDifficulty(base_shape_selfRight_core);

// 生成形状辨别条件的完整双标签变体
var conditions_shape_selfLeft = generateDiscriminationConditions(base_shape_selfLeft, {
  "circle": ["圆", "方"],
  "square": ["方", "圆"]
});

var conditions_shape_selfRight = generateDiscriminationConditions(base_shape_selfRight, {
  "circle": ["圆", "方"],
  "square": ["方", "圆"]
});


//主要呈现的刺激

// 统一的辨别任务 RDK 刺激（用于任务相关、任务无关、任务重合）
// 使用 F/J 键，在散点图下方显示文字标签，标签位置由条件数组决定
var RDK_discrimination = {
  type: jsPsychRdk,
  number_of_dots: 100,
  dot_color: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"],
  dot_shape_ratio: 0.5,
  coherent_direction: 0,
  coherence: 0,
  // dot_side_length: 4,
  choices: ["f", "j"],
  correct_choice: function () { return jsPsych.timelineVariable("correct_choice") }, 
  dot_color_final: function () { return jsPsych.timelineVariable("dot_color_final") },
  target_color_proportion: function () { return jsPsych.timelineVariable("target_color_proportion") },
  dot_shape: function () { return jsPsych.timelineVariable("dot_shape") },
  dot_shape_ratio: function () { return jsPsych.timelineVariable("dot_shape_ratio") },
  dot_radius: 5,
  move_distance: 2.2,
  aperture_width: 400,
  aperture_height: 400,
  // aperture_center_x: 960,
  // aperture_center_y: 330,
  background_color: "black",
  trial_duration: -1,
  data: {
    part: function () { return jsPsych.timelineVariable("data_part") },
    task: "response",
    task_type: function () { return jsPsych.timelineVariable("task_type") },
    difficulty: function () { return jsPsych.timelineVariable("difficulty") },
    association: function () { return jsPsych.timelineVariable("association") },
    correct_value: function () { return jsPsych.timelineVariable("correct_value") },
    label_left: function () { return jsPsych.timelineVariable("label_left") },
    label_right: function () { return jsPsych.timelineVariable("label_right") }
  },
  on_start: function() {
    // 统一更新所有条件数组的 coherence/proportion
    updateCoherence(conditions_color_selfLeft);
    updateCoherence(conditions_color_selfRight);
    updateCoherence(conditions_shape_selfLeft);
    updateCoherence(conditions_shape_selfRight);
    if (typeof conditions_overlap_selfLeft !== 'undefined') {
      updateCoherence(conditions_overlap_selfLeft);
      updateCoherence(conditions_overlap_selfRight);
    }

    // 创建散点图下方的文字标签
    var label_left = jsPsych.timelineVariable("label_left");
    var label_right = jsPsych.timelineVariable("label_right");
    var taskType = jsPsych.timelineVariable("task_type");

    // 任务重合条件：将"他"替换为性别对应称呼
    if (taskType === "overlap") {
      var otherLabel = (typeof labelVar !== 'undefined' && labelVar) ? labelVar : "TA";
      if (label_left === "他") { label_left = otherLabel; }
      if (label_right === "他") { label_right = otherLabel; }
    }

    var displayElement = jsPsych.getDisplayElement();

    // 左侧标签
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

    // 右侧标签
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
    data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_choice);
  },
};


//设置 block 的反馈

var feedbackBlock_RDK = {
  type: jsPsychHtmlKeyboardResponse,
  trial_duration: 3000,
  stimulus: function() {
    var trials = jsPsych.data.get().filter({task: 'response'}).last(64)
    var correct_trials = trials.filter({correct: true});
    var accuracy = Math.round(correct_trials.count() / trials.count() * 100);
    var rt = Math.round(trials.select('rt').mean());
    console.log({ accuracy: accuracy, rt: rt });
    return `<p style='font-size: 35px; color: white'>本组测试中，您的正确率为： ${accuracy}% ，平均反应时为：${rt}毫秒。</p>`;   
  }
};


// 形状辨别任务的练习和正式block
var practiceSet_shape_selfLeft = createPracticeSet(conditions_shape_selfLeft, 8);
var practice_block_shape_selfLeft = {
  timeline: [
    instruction_RDK_beginning,
    instruction_RDK_practice,
    {
      timeline: [fixation, RDK_discrimination, feedbackTrial],
      timeline_variables: practiceSet_shape_selfLeft,
      repetitions: 2,
      randomize_order: true
    },
    instruction_RDK_practice_end
  ],
  loop_function: function(){
    var data = jsPsych.data.get().last(1).values()[0];
    if (jsPsych.pluginAPI.compareKeys(data.response, "q")) {
      return true;
    } else {
      return false;
    }
  },
};

var practiceSet_shape_selfRight = createPracticeSet(conditions_shape_selfRight, 8);
var practice_block_shape_selfRight = {
  timeline: [
    instruction_RDK_beginning,
    instruction_RDK_practice,
    {
      timeline: [fixation, RDK_discrimination, feedbackTrial],
      timeline_variables: practiceSet_shape_selfRight,
      repetitions: 2,
      randomize_order: true
    },
    instruction_RDK_practice_end
  ],
  loop_function: function(){
    var data = jsPsych.data.get().last(1).values()[0];
    if (jsPsych.pluginAPI.compareKeys(data.response, "q")) {
      return true;
    } else {
      return false;
    }
  },
};

var practice_shape_selfLeft = {
  timeline: [practice_block_shape_selfLeft],
  conditional_function: function(){
    if (userId % 2 === 0) {
      console.log("practice_shape_selfLeft");
      return true;
    } else {
      return false;
    }
  }
};

var practice_shape_selfRight = {
  timeline: [practice_block_shape_selfRight],
  conditional_function: function(){
    if (userId % 2 !== 0) {
      console.log("practice_shape_selfRight");
      return true;
    } else {
      return false;
    }
  }
};

var practice_block_shape = { 
  timeline: [practice_shape_selfLeft, practice_shape_selfRight]
};

var formal_block_shape_selfLeft = {
  timeline: [
    instruction_RDK_formal_beginning,
    // Block 1
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_shape_selfLeft,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
    rest_rdk,
    // Block 2
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_shape_selfLeft,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
  ],
};

var formal_block_shape_selfRight = {
  timeline: [
    instruction_RDK_formal_beginning,
    // Block 1
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_shape_selfRight,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
    rest_rdk,
    // Block 2
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_shape_selfRight,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
  ],
};

var formal_shape_selfLeft = {
  timeline: [formal_block_shape_selfLeft],
  conditional_function: function(){
    if (userId % 2 === 0) {
      console.log("formal_shape_selfLeft");
      return true;
    } else {
      return false;
    }
  }
};

var formal_shape_selfRight = {
  timeline: [formal_block_shape_selfRight],
  conditional_function: function(){
    if (userId % 2 !== 0) {
      console.log("formal_shape_selfRight");
      return true;
    } else {
      return false;
    }
  }
};

var formal_block_shape = { 
  timeline: [formal_shape_selfLeft, formal_shape_selfRight]
};

// ---------------------------------- 整体颜色判断任务 -----------------------------

//指导语(包含开始，练习和结束)

var instruction_color_beginning = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
      <div style="text-align: left; color: white; padding: 10px"> 
        <h3 style="text-align: center; font-size: 30px; margin: 10px">接下来是：整体颜色判断任务</h3>
        <p>屏幕上会呈现一些运动的圆点，其中一定比例的点为 <span style="color: hsl(0, 50%, 50%)">红色</span> ，其余为 <span style="color: hsl(225, 50%, 50%)">蓝色</span>，</p>
        <p>您需要判断 <span style="font-weight: bold">散点图的整体颜色（即大多数点的颜色）是红色还是蓝色 </span></p >
        <p>散点图下方会显示"红"和"蓝"的文字标签，</p>
        <ul>
          <li>若整体为 <span style="color: hsl(0, 50%, 50%)">红色</span>，请按对应文字标签所在侧的键（左侧按 <span style="font-weight: bold">F</span>，右侧按 <span style="font-weight: bold">J</span>）</li>
          <li>若整体为 <span style="color: hsl(225, 50%, 50%)">蓝色</span>，请按对应文字标签所在侧的键（左侧按 <span style="font-weight: bold">F</span>，右侧按 <span style="font-weight: bold">J</span>）</li>
        </ul>
        <p>请按下空格键进入练习阶段</p>
      </div>`,
  response_ends_trial: true,
  choices: " ",
  data: {
    part: "instruction_RDK_beginning",
  }
};

//下面这些指导语会在后面 push

var instruction_color = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div style="text-align: center; color: white; padding: 35px; font-size: 30px">
      <p>请把左手食指放在键盘 <span style="font-weight: bold">"F"键</span> 上，右手食指放在 <span style="font-weight: bold">"J"键</span> 上</p >
      <p>请按下空格键开始</p >
    </div>
    `,
  response_ends_trial: true,
  choices: " ",
  on_start: function() {
    currentBlock = 0
  },
  on_finish: function () {
    document.body.style.backgroundColor = "black";
  },
  data: {
    part: "instruction"
  }
};

// end 的指导语是一样的


//整体颜色判断任务的不同条件(颜色和运动方向都分容易和困难， 方向越一致干扰越大)

// 颜色辨别任务基础条件（任务无关），目标=颜色，通过 addShapeDifficulty 正交增加形状维度难度（仅 easy）
// 注意：association 由 addShapeDifficulty 根据形状自动设置，不在core中预定义
var base_color_selfLeft_core = [
  // target=color, easy, red-majority
  { target_color_proportion: 0.59, dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], difficulty: "easy",
    coherent_direction: 0, coherence: 0, correct_value: "red", task_type: "irrelevant", data_part: "RDK_color" },
  // target=color, easy, blue-majority
  { target_color_proportion: 0.59, dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], difficulty: "easy",
    coherent_direction: 0, coherence: 0, correct_value: "blue", task_type: "irrelevant", data_part: "RDK_color" }
];
// selfLeft: circle=self, square=other
var base_color_selfLeft = addShapeDifficulty(base_color_selfLeft_core, "circle");
var conditions_color_selfLeft = generateDiscriminationConditions(base_color_selfLeft, {
  "red": ["红", "蓝"],
  "blue": ["蓝", "红"]
});

// 颜色辨别任务基础条件（任务无关），目标=颜色，通过 addShapeDifficulty 正交增加形状维度难度（仅 easy）
var base_color_selfRight_core = [
  // target=color, easy, red-majority
  { target_color_proportion: 0.59, dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], difficulty: "easy",
    coherent_direction: 0, coherence: 0, correct_value: "red", task_type: "irrelevant", data_part: "RDK_color" },
  // target=color, easy, blue-majority
  { target_color_proportion: 0.59, dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], difficulty: "easy",
    coherent_direction: 0, coherence: 0, correct_value: "blue", task_type: "irrelevant", data_part: "RDK_color" }
];
// selfRight: square=self, circle=other
var base_color_selfRight = addShapeDifficulty(base_color_selfRight_core, "square");
var conditions_color_selfRight = generateDiscriminationConditions(base_color_selfRight, {
  "red": ["红", "蓝"],
  "blue": ["蓝", "红"]
});

/* ==================== 任务重合条件（身份判断） ==================== */
// 被试判断散点图代表"我"还是"他/她"，根据关联维度推断身份
// 目标=形状（身份），通过 addColorDifficulty 正交增加颜色维度难度
// selfLeft（userId偶数）：大多数为圆形=自我，大多数为正方形=他人
var base_overlap_selfLeft_core = [
  // easy only
  { dot_shape_ratio: 0.59, dot_shape: "circle", difficulty: "easy", association: "self",
    coherent_direction: 0, coherence: 0, correct_value: "self", task_type: "overlap", data_part: "RDK_overlap" },
  { dot_shape_ratio: 0.59, dot_shape: "square", difficulty: "easy", association: "other",
    coherent_direction: 0, coherence: 0, correct_value: "other", task_type: "overlap", data_part: "RDK_overlap" }
];
var base_overlap_selfLeft = addColorDifficulty(base_overlap_selfLeft_core);

// selfRight（userId奇数）：大多数为正方形=自我，大多数为圆形=他人
var base_overlap_selfRight_core = [
  // easy only
  { dot_shape_ratio: 0.59, dot_shape: "square", difficulty: "easy", association: "self",
    coherent_direction: 0, coherence: 0, correct_value: "self", task_type: "overlap", data_part: "RDK_overlap" },
  { dot_shape_ratio: 0.59, dot_shape: "circle", difficulty: "easy", association: "other",
    coherent_direction: 0, coherence: 0, correct_value: "other", task_type: "overlap", data_part: "RDK_overlap" }
];
var base_overlap_selfRight = addColorDifficulty(base_overlap_selfRight_core);

var conditions_overlap_selfLeft = generateDiscriminationConditions(base_overlap_selfLeft, {
  "self": ["我", "他"],
  "other": ["他", "我"]
});

var conditions_overlap_selfRight = generateDiscriminationConditions(base_overlap_selfRight, {
  "self": ["我", "他"],
  "other": ["他", "我"]
});

//主要呈现的刺激

// 颜色辨别任务使用统一的 RDK_discrimination（F/J键 + 标签显示）
var RDK_color = RDK_discrimination;

//练习阶段的任务

var practiceSet_color_selfLeft = createPracticeSet(conditions_color_selfLeft, 8);
var practice_block_color_selfLeft = {
  timeline: [
    instruction_color_beginning,
    instruction_color,
    {
      timeline: [fixation, RDK_color, feedbackTrial],
      timeline_variables: practiceSet_color_selfLeft,
      repetitions: 2,
      randomize_order: true
    },
    instruction_RDK_practice_end
  ],
  loop_function: function () {
    var data = jsPsych.data.get().last(1).values()[0];
    if (jsPsych.pluginAPI.compareKeys(data.response, "q")) {
      return true;
    } else {
      return false;
    }
  },
};

var practiceSet_color_selfRight = createPracticeSet(conditions_color_selfRight, 8);
var practice_block_color_selfRight = {
  timeline: [
    instruction_color_beginning,
    instruction_color,
    {
      timeline: [fixation, RDK_color, feedbackTrial],
      timeline_variables: practiceSet_color_selfRight,
      repetitions: 2,
      randomize_order: true
    },
    instruction_RDK_practice_end
  ],
  loop_function: function () {
    var data = jsPsych.data.get().last(1).values()[0];
    if (jsPsych.pluginAPI.compareKeys(data.response, "q")) {
      return true;
    } else {
      return false;
    }
  },
};

var practice_color_selfLeft = {
  timeline: [practice_block_color_selfLeft],
  conditional_function: function(){
    if (userId % 2 === 0) {
      console.log("practice_selfLeft");
      return true;
    } else {
      return false;
    }
  }
};

var practice_color_selfRight = {
  timeline: [practice_block_color_selfRight],
  conditional_function: function(){
    if (userId % 2 !== 0) {
      console.log("practice_selfRight");
      return true;
    } else {
      return false;
    }
  }
};


var practice_block_color = { 
  timeline: [practice_color_selfLeft, practice_color_selfRight]
};


// shape.timeline.push(practice_block_color);

//正式阶段的任务

//设置反馈

// 正式阶段的反馈也是一样的

// var feedbackBlock_RDK = {
//   type: jsPsychHtmlKeyboardResponse,
//   trial_duration: 3000,
//   stimulus: function() {
//     var trials = jsPsych.data.get().filter({task: 'response'}).last(48)
//     var correct_trials = trials.filter({correct: true});
//     var accuracy = Math.round(correct_trials.count() / trials.count() * 100);
//     var rt = Math.round(trials.select('rt').mean());
//     console.log({ accuracy: accuracy, rt: rt });
//     return `<p style='font-size: 35px; color: white'>本组测试中，您的正确率为： ${accuracy}% ，平均反应时为：${rt}毫秒。</p>`;   
//   }
// };

var formal_block_color_selfLeft = {
  timeline: [
    instruction_color,
    // Block 1
    {
      timeline: [fixation, RDK_color],
      timeline_variables: conditions_color_selfLeft,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
    rest_rdk,
    // Block 2
    {
      timeline: [fixation, RDK_color],
      timeline_variables: conditions_color_selfLeft,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
  ],
};

var formal_block_color_selfRight = {
  timeline: [
    instruction_color,
    // Block 1
    {
      timeline: [fixation, RDK_color],
      timeline_variables: conditions_color_selfRight,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
    rest_rdk,
    // Block 2
    {
      timeline: [fixation, RDK_color],
      timeline_variables: conditions_color_selfRight,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
  ],
};

// 下面是条件判断，可能有点冗余，后面再优化

// 根据被试编号判断是执行selfLeft还是selfRight
var formal_color_selfLeft = {
  timeline: [formal_block_color_selfLeft],
  conditional_function: function(){
    if (userId % 2 === 0) {
      console.log("formal_color_selfLeft");
      return true;
    } else {
      return false;
    }
  }
};

var formal_color_selfRight = {
  timeline: [formal_block_color_selfRight],
  conditional_function: function(){
    if (userId % 2 !== 0) {
      console.log("formal_color_selfRight");
      return true;
    } else {
      return false;
    }
  }
};


var formal_block_color= { 
  timeline: [formal_color_selfLeft, formal_color_selfRight]
};

/* ==================== 任务重合（身份判断）Block ==================== */

// var instruction_overlap = {
//   type: jsPsychHtmlKeyboardResponse,
//   stimulus: `
//     <div style="text-align: left; color: white; padding: 10px"> 
//       <h3 style="text-align: center; font-size: 30px; margin: 10px">接下来是：身份判断任务</h3>
//       <p>屏幕上会呈现运动的彩色圆点，</p>
//       <p>您需要根据之前学习过的规则，判断散点图代表的是<span style="font-weight: bold">您自己</span>还是<span style="font-weight: bold">他人</span>：</p>
//       <ul>
//         <li>若代表<span style="font-weight: bold">"我"</span>，请按文字标签所在侧的对应键</li>
//         <li>若代表<span style="font-weight: bold">"他/她"</span>，请按文字标签所在侧的对应键</li>
//       </ul>
//       <p>散点图下方会显示"我"和"他/她"的文字标签，</p>
//       <p>哪个标签的答案正确，就按那一侧的键：左侧按 <span style="font-weight: bold">F</span>，右侧按 <span style="font-weight: bold">J</span></p>
//       <p>请按下空格键进入练习阶段</p>
//     </div>`,
//   response_ends_trial: true,
//   choices: " ",
//   on_start: function() {
//     document.body.style.backgroundColor = "black";
//     currentBlock = 1;
//   },
//   data: { part: "instruction_overlap" }
// };

var instruction_overlap = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "",
  on_start: function () {
    currentBlock = 0;
    //document.body.style.backgroundColor = "black";
    if (userId % 2 === 0) {
      this.stimulus = `
        <div style="text-align: left; color: white; padding: 10px">  
          <h3 style="text-align: center; font-size: 30px; margin: 10px;">接下来是：身份判断任务</h3>
          <p>屏幕上会呈现运动的彩色圆点，</p>
          <p>大多数点为<span style="font-weight: bold">圆形</span>代表<span style="font-weight: bold">你自己</span>，为<span style="font-weight: bold">正方形</span>代表<span style="font-weight: bold">他人</span>。</p >
          <p>您需要判断散点图代表的是<span style="font-weight: bold">您自己</span>还是<span style="font-weight: bold">他人</span></p>
          <p>散点图下方会显示"我"和"他/她"的文字标签，</p>
          <ul>
            <li>若代表<span style="font-weight: bold">"我"</span>，请按文字标签所在侧的对应键</li>
            <li>若代表<span style="font-weight: bold">"他/她"</span>，请按文字标签所在侧的对应键</li>
          </ul>
          <p>请按下空格键进入练习阶段</p>
        </div>`
    } else {
      this.stimulus = `
        <div style="text-align: left; color: white; padding: 10px">  
          <h3 style="text-align: center; font-size: 30px; margin: 10px;">接下来是：身份判断任务</h3>
          <p>屏幕上会呈现运动的彩色圆点，</p>
          <p>大多数点为<span style="font-weight: bold">正方形</span>代表<span style="font-weight: bold">你自己</span>，为<span style="font-weight: bold">圆形</span>代表<span style="font-weight: bold">他人</span>。</p >
          <p>您需要判断散点图代表的是<span style="font-weight: bold">您自己</span>还是<span style="font-weight: bold">他人</span></p>
          <p>散点图下方会显示"我"和"他/她"的文字标签，</p>
          <ul>
            <li>若代表<span style="font-weight: bold">"我"</span>，请按文字标签所在侧的对应键</li>
            <li>若代表<span style="font-weight: bold">"他/她"</span>，请按文字标签所在侧的对应键</li>
          </ul>
          <p>请按下空格键进入练习阶段</p>
        </div>`;
    }
  },
  response_ends_trial: true,
  choices: " ",
  data: {
    part: "instruction_overlap",
  }
};

// 练习阶段
var practiceSet_overlap_selfLeft = createPracticeSet(conditions_overlap_selfLeft, 8);
var practice_block_overlap_selfLeft = {
  timeline: [
    instruction_overlap,
    instruction_RDK_practice,
    {
      timeline: [fixation, RDK_discrimination, feedbackTrial],
      timeline_variables: practiceSet_overlap_selfLeft,
      repetitions: 2,
      randomize_order: true
    },
    instruction_RDK_practice_end
  ],
  loop_function: function () {
    var data = jsPsych.data.get().last(1).values()[0];
    if (jsPsych.pluginAPI.compareKeys(data.response, "q")) {
      return true;
    } else {
      return false;
    }
  },
};

var practiceSet_overlap_selfRight = createPracticeSet(conditions_overlap_selfRight, 8);
var practice_block_overlap_selfRight = {
  timeline: [
    instruction_overlap,
    instruction_RDK_practice,
    {
      timeline: [fixation, RDK_discrimination, feedbackTrial],
      timeline_variables: practiceSet_overlap_selfRight,
      repetitions: 2,
      randomize_order: true
    },
    instruction_RDK_practice_end
  ],
  loop_function: function () {
    var data = jsPsych.data.get().last(1).values()[0];
    if (jsPsych.pluginAPI.compareKeys(data.response, "q")) {
      return true;
    } else {
      return false;
    }
  },
};

var practice_overlap_selfLeft = {
  timeline: [practice_block_overlap_selfLeft],
  conditional_function: function () {
    return (userId % 2 === 0);
  }
};

var practice_overlap_selfRight = {
  timeline: [practice_block_overlap_selfRight],
  conditional_function: function () {
    return (userId % 2 !== 0);
  }
};

var practice_block_overlap = {
  timeline: [practice_overlap_selfLeft, practice_overlap_selfRight]
};

// 正式阶段
var formal_block_overlap_selfLeft = {
  timeline: [
    instruction_RDK_formal_beginning,
    // Block 1
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_overlap_selfLeft,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
    rest_rdk,
    // Block 2
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_overlap_selfLeft,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
  ],
};

var formal_block_overlap_selfRight = {
  timeline: [
    instruction_RDK_formal_beginning,
    // Block 1
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_overlap_selfRight,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
    rest_rdk,
    // Block 2
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_overlap_selfRight,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
  ],
};

var formal_overlap_selfLeft = {
  timeline: [formal_block_overlap_selfLeft],
  conditional_function: function () {
    return (userId % 2 === 0);
  }
};

var formal_overlap_selfRight = {
  timeline: [formal_block_overlap_selfRight],
  conditional_function: function () {
    return (userId % 2 !== 0);
  }
};

var formal_block_overlap = {
  timeline: [formal_overlap_selfLeft, formal_overlap_selfRight]
};

// 三个辨别任务的6种随机顺序（被试间平衡）
// 每种顺序包含：练习(practice) → 正式(formal)
// 运行时根据 userId 选取顺序（每6名被试循环一次），确保被试间平衡

var block_order_0 = {
  timeline: [practice_block_shape, formal_block_shape, practice_block_color, formal_block_color, practice_block_overlap, formal_block_overlap],
  conditional_function: function() {
    var val = ((window.userId - 1) % 6 + 6) % 6;
    console.log("[block_order_0] window.userId:", window.userId, "computed:", val, "match:", val === 0);
    return val === 0;
  },
  on_start: function() { console.log("任务呈现顺序 [0]: 形状→颜色→重合"); }
};
var block_order_1 = {
  timeline: [practice_block_shape, formal_block_shape, practice_block_overlap, formal_block_overlap, practice_block_color, formal_block_color],
  conditional_function: function() {
    var val = ((window.userId - 1) % 6 + 6) % 6;
    console.log("[block_order_1] window.userId:", window.userId, "computed:", val, "match:", val === 1);
    return val === 1;
  },
  on_start: function() { console.log("任务呈现顺序 [1]: 形状→重合→颜色"); }
};
var block_order_2 = {
  timeline: [practice_block_color, formal_block_color, practice_block_shape, formal_block_shape, practice_block_overlap, formal_block_overlap],
  conditional_function: function() {
    var val = ((window.userId - 1) % 6 + 6) % 6;
    console.log("[block_order_2] window.userId:", window.userId, "computed:", val, "match:", val === 2);
    return val === 2;
  },
  on_start: function() { console.log("任务呈现顺序 [2]: 颜色→形状→重合"); }
};
var block_order_3 = {
  timeline: [practice_block_color, formal_block_color, practice_block_overlap, formal_block_overlap, practice_block_shape, formal_block_shape],
  conditional_function: function() {
    var val = ((window.userId - 1) % 6 + 6) % 6;
    console.log("[block_order_3] window.userId:", window.userId, "computed:", val, "match:", val === 3);
    return val === 3;
  },
  on_start: function() { console.log("任务呈现顺序 [3]: 颜色→重合→形状"); }
};
var block_order_4 = {
  timeline: [practice_block_overlap, formal_block_overlap, practice_block_shape, formal_block_shape, practice_block_color, formal_block_color],
  conditional_function: function() {
    var val = ((window.userId - 1) % 6 + 6) % 6;
    console.log("[block_order_4] window.userId:", window.userId, "computed:", val, "match:", val === 4);
    return val === 4;
  },
  on_start: function() { console.log("任务呈现顺序 [4]: 重合→形状→颜色"); }
};
var block_order_5 = {
  timeline: [practice_block_overlap, formal_block_overlap, practice_block_color, formal_block_color, practice_block_shape, formal_block_shape],
  conditional_function: function() {
    var val = ((window.userId - 1) % 6 + 6) % 6;
    console.log("[block_order_5] window.userId:", window.userId, "computed:", val, "match:", val === 5);
    return val === 5;
  },
  on_start: function() { console.log("任务呈现顺序 [5]: 重合→颜色→形状"); }
};

var block_RDK = {
  timeline: [block_order_0, block_order_1, block_order_2, block_order_3, block_order_4, block_order_5],
  on_start: function() { console.log("[block_RDK] Starting discrimination tasks, window.userId:", window.userId); }
};

shape.timeline.push(block_RDK);

// over