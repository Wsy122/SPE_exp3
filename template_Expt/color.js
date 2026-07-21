/*---------------------------------------------------------------------------------
这段代码主要用于执行颜色条件下的实验，即人物标签与颜色匹配，之后进行散点群整体颜色判断
在当前的版本中，人物改为 “我”，“他/她”
并且，标签会分别于 4 种不同难度水平的散点图进行匹配
不同的难度条件随机呈现
匹配任务：2*16 个练习 trial，2 * 16 * 4 = 128 个正式 trial 
随机动点任务：2*8 = 16 个练习 trial，4 * 8 * 4 = 128 个正式 trial 每种条件40个trial
- 更新：每种条件24个trial
- 匹配任务：2*16=32个练习，24*16=384个正式/8 block
- 随机动点任务：
  - 运动：2*8=16个练习，24*8=192个正式/4 block
  - 颜色：3*8=24个练习，24*8=192个正式/4 block
-----------------------------------------------------------------------------------*/
var color = {
  timeline: []
};

var currentBlock = 0

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

// 条件生成器：将 base condition 扩展为两种标签位置变体，使用 F/J 键
function generateDiscriminationConditions(baseTrials, labelMap) {
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

// 定义一个函数来处理条件匹配和更新proportion值（仅 easy：0.59 映射到阈值收敛值）
function updateProportion(arr) {
  for (let i in arr) {
    const proportion = arr[i].target_color_proportion;
    const coherence = arr[i].coherence;
    switch (proportion) {
      case 0.59:
        arr[i].target_color_proportion = window.colorProportion[1];
        break;
    }
    switch (coherence) {
      case 0.20:
        arr[i].coherence = window.coherence[1];
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



// 生成器：在颜色辨别条件上正交增加形状维度难度（2种形状组合，仅 easy）
function addShapeDifficulty(baseTrials) {
  var result = [];
  baseTrials.forEach(function(trial) {
    // shape easy, circle majority
    result.push(Object.assign({}, trial, {
      dot_shape_ratio: 0.59,
      dot_shape: "circle"
    }));
    // shape easy, square majority
    result.push(Object.assign({}, trial, {
      dot_shape_ratio: 0.59,
      dot_shape: "square"
    }));
  });
  return result;
}

// 生成器：在形状辨别条件上正交增加颜色维度难度（2种颜色组合，仅 easy）
// colorToSelf: 若提供（"red"或"blue"），则根据颜色多数类型设置 association
function addColorDifficulty(baseTrials, colorToSelf) {
  var result = [];
  var colorVariants = [
    { target_color_proportion: 0.59, dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"] },
    { target_color_proportion: 0.59, dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"] }
  ];
  baseTrials.forEach(function(trial) {
    colorVariants.forEach(function(variant) {
      var newTrial = Object.assign({}, trial, variant);
      if (colorToSelf !== undefined) {
        // 判断该变体的多数颜色：dot_color_final[0] 为红色则为红多，蓝色则为蓝多
        var isRedMajority = variant.dot_color_final[0] === "hsl(0, 50%, 50%)";
        var majorityColor = isRedMajority ? "red" : "blue";
        newTrial.association = (majorityColor === colorToSelf) ? "self" : "other";
      }
      result.push(newTrial);
    });
  });
  return result;
}


//--------------------匹配判断------------------------
//匹配判断包含：指导语，示例，练习和正式任务

// 指导语
var instruction_match = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "",
  on_start: function () {
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
      this.stimulus = `
        <div style="text-align: left; color: white; padding: 10px"> 
          <h3 style="text-align: center; font-size: 30px; margin: 10px">任务一：关联学习</h3>
          <p>接下来，屏幕上会呈现一些运动的圆点，其中一定比例的点为 <span style="color: hsl(0, 50%, 50%)">红色</span> ，其余为<span style="color: hsl(225, 50%, 50%)">蓝色</span> 。</p>
          <p>同时散点图的下方会出现 "我" 或 "${labelVar}" 的文字标签。</p >
          <p>如果大多数点的颜色为<span style="color: hsl(0, 50%, 50%)">红色</span>代表<span style="color: hsl(0, 50%, 50%)">你自己</span> ，为<span style="color: hsl(225, 50%, 50%)">蓝色</span> 代表 <span style="color: hsl(225, 50%, 50%)">他人</span>。</p >
          <p>您需要判断 <span style="font-weight: bold">散点图的整体颜色与文字是否匹配</span> 。</p >
          <ul>
            <li><span style="color: hsl(135, 50%, 50%)">匹配</span>，请按键盘 <span style="color: hsl(135, 50%, 50%)">"F" 键</span>；</li>
            <li><span style="color: red">不匹配</span>，请按键盘 <span style="color: red">"J" 键</span> </li>
          </ul>
          <p style="font-weight: bold">请尽可能又快又准地做出反应</p >
        </div>`;
    } else {
      this.stimulus = `
        <div style="text-align: left; color: white; padding: 10px"> 
          <h3 style="text-align: center; font-size: 30px; margin: 10px">任务一：关联学习</h3>
          <p>接下来，屏幕上会呈现一些运动的圆点，其中一定比例的点为<span style="color: hsl(0, 50%, 50%)">红色</span> ，其余为<span style="color: hsl(225, 50%, 50%)">蓝色</span> 。</p>
          <p>同时散点图的下方会出现 "我" 或 "${labelVar}"  的文字标签。</p >
          <p>如果大多数点的颜色为<span style="color: hsl(225, 50%, 50%)">蓝色</span>代表<span style="color: hsl(225, 50%, 50%)">你自己</span> ，为<span style="color: hsl(0, 50%, 50%)">红色</span>代表<span style="color: hsl(0, 50%, 50%)">他人</span>。</p >
          <p>您需要判断 <span style="font-weight: bold">散点图的整体颜色与文字是否匹配</span> 。</p >
          <ul>
            <li><span style="color: hsl(135, 50%, 50%)">匹配</span>，请按键盘 <span style="color: hsl(135, 50%, 50%)">"F" 键</span>；</li>
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

color.timeline.push(instruction_match);


// 练习

var instruction_match_practice = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "",
  on_start: function () {
    //document.body.style.backgroundColor = "black";
    if (userId % 2 === 0) {
      this.stimulus = `
        <div style="text-align: left; color: white; padding: 10px">  
          <h3 style="text-align: center; font-size: 30px; margin: 10px;">学习阶段</h3>
          <p>整体颜色为<span style="color: hsl(0, 50%, 50%)">红色</span>代表<span style="color: hsl(0, 50%, 50%)">你自己</span> ，为<span style="color: hsl(225, 50%, 50%)">蓝色</span>代表<span style="color: hsl(225, 50%, 50%)">他人</span>。</p >
          <p>您需要判断 <span style="font-weight: bold">散点图的整体颜色与文字是否匹配</span>，<span style="color: hsl(135, 50%, 50%);">匹配</span> 按 <span style="color: hsl(135, 50%, 50%);">"F" 键</span>；<span style="color: red;">不匹配</span> 按 <span style="color: red;">"J" 键</span> </p >
          <p>正确率达到 90% 及以上才能完成关联学习</p >
          <p>请把左手食指放在 "F" 键上，右手食指放在 "J" 键上</p >
          <p>请按下空格键开始练习</p >
        </div>`;
    } else {
      this.stimulus = `
        <div style="text-align: left; color: white; padding: 10px">  
          <h3 style="text-align: center; font-size: 30px; margin: 10px;">学习阶段</h3>
          <p>整体颜色为<span style="color: hsl(225, 50%, 50%)">蓝色</span>代表<span style="color: hsl(225, 50%, 50%)">你自己</span> ，为<span style="color: hsl(0, 50%, 50%)">红色</span>代表<span style="color: hsl(0, 50%, 50%)">他人</span>。</p >
          <p>您需要判断 <span style="font-weight: bold">散点图的整体颜色与文字是否匹配</span>，<span style="color: hsl(135, 50%, 50%);">匹配</span> 按 <span style="color: hsl(135, 50%, 50%);">"F" 键</span>；<span style="color: red;">不匹配</span> 按 <span style="color: red;">"J" 键</span> </p >
          <p>正确率达到 90% 及以上才能完成关联学习</p >
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

//color.timeline.push(instruction_practice);

var fixation = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "<p style='font-size: 48px; color: white'>+</p >",
  trial_duration: 500,
  choices: "NO-KEYS",
  data: {
    part: "fixation"
  }
};

//匹配判断任务的不同条件(subjectId 为偶数，则红色代表自己；subjectId 为奇数，则蓝色代表自己)

let conditions_match_selfRed = [
  // easy only (删除 hard 水平)
  { target_color_proportion: 0.59, dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], label: "我", correct_choice: "f", isMatch: "match", association: "self", difficulty:"easy"},
  { target_color_proportion: 0.59, dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], label: "我", correct_choice: "j", isMatch: "mismatch", association: "other", difficulty:"easy"},
  { target_color_proportion: 0.59, dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], label: "他", correct_choice: "f", isMatch: "match", association: "other", difficulty:"easy"},
  { target_color_proportion: 0.59, dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], label: "他", correct_choice: "j", isMatch: "mismatch", association: "self", difficulty:"easy"},
];

let conditions_match_selfBlue = [
  // easy only
  { target_color_proportion: 0.59, dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], label: "我", correct_choice: "f", isMatch: "match", association: "self", difficulty:"easy"},
  { target_color_proportion: 0.59, dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], label: "我", correct_choice: "j", isMatch: "mismatch", association: "other", difficulty:"easy"},
  { target_color_proportion: 0.59, dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], label: "他", correct_choice: "f", isMatch: "match", association: "other", difficulty:"easy"},
  { target_color_proportion: 0.59, dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], label: "他", correct_choice: "j", isMatch: "mismatch", association: "self", difficulty:"easy"},
]

// 设置匹配任务的主要刺激

var match_RDK = {
  type: jsPsychRdk,
  canvas_height: 600,
  number_of_apertures: 1,
  number_of_dots: 100,
  //post_trial_gap: 500,
  dot_shape_ratio:0.5,
  dot_color: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"],
  dot_color_final: function () { return jsPsych.timelineVariable("dot_color_final") },
  target_color_proportion: function () { return jsPsych.timelineVariable("target_color_proportion") },
  color_change_delay: 0,
  choices: ["f", "j"],
  correct_choice: function () { return jsPsych.timelineVariable("correct_choice") },
  coherent_direction: 0,
  coherence: 0,
  dot_radius: 5, 
  move_distance: 2.2, 
  aperture_width: 400,
  aperture_height: 400,
  // aperture_center_x: 960,
  aperture_center_y: 300,
  background_color: "black",
  trial_duration: -1,
  data: {
    part: "match_RDK",
    task: "response",
    difficulty: function () { return jsPsych.timelineVariable("difficulty") },
    //correct_response: function () { return jsPsych.timelineVariable("correct_choice") },
    isMatch: function () { return jsPsych.timelineVariable("isMatch") },
    association: function () { return jsPsych.timelineVariable("association") },
    label: function () { return jsPsych.timelineVariable("label") },
  },
  on_start: function () {

    // 替换所有 label 为"他"的元素为性别对应称呼
    for (let i = 0; i < conditions_match_selfRed.length; i++) {
      if (conditions_match_selfRed[i].label === "他") {
        conditions_match_selfRed[i].label = `${labelVar}`;
      }
      if (conditions_match_selfBlue[i].label === "他") {
        conditions_match_selfBlue[i].label = `${labelVar}`;
      }
    };

    //替换proportion值
    updateProportion(conditions_match_selfBlue);
    updateProportion(conditions_match_selfRed);
  
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
    // img.style.bottom = "58%";   // 微调位置
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
    }, 100000);*/
  },
  on_finish: function (data) {
    data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_choice);
    console.log('current coherence ', data.target_color_proportion)
  },
};

//练习阶段每个试次的反馈

var feedbackTrial = {
  type: jsPsychHtmlKeyboardResponse,
  trial_duration: 500,
  stimulus: function () {
    // this function will check the accuracy of the last response and use that information to set
    // the stimulus value on each trial.
    var trial_data = jsPsych.data.get().last(1).values()[0];
    var correct = trial_data.correct;
    var rt = trial_data.rt
    if (rt > 0 && rt < 250) {
      return `<p style='font-size: 60px; color: yellow'>太快!</p>`;
    } else if (rt > 3000) {
      return `<p style='font-size: 60px; color: yellow'>太慢!</p>`;
    } else if (correct) {
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
  stimulus: function () {
    var trial_data = jsPsych.data.get().last(1).values()[0];
    var correct = trial_data.correct;
    var rt = trial_data.rt
    if (rt > 0 && rt < 250) {
      return `<p style='font-size: 60px; color: yellow'>太快!</p>`;
    } else if (correct) {
      return `<p style='font-size: 60px; color: green'>正确!</p>`;
    } else {
      return `<p style='font-size: 60px; color: red'>错误!</p>`;
    }
  },
};

//计算整个练习阶段的总体正确率
//计算32个试次的反应数，挑出正确的试次数，计算准确率 
//如果整体正确率未达到90%，告知被试继续下一轮测试

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
// 每次 loop 只跑 1 个 block（32 trials），由 loop_function 控制流程
var match_pract_block = 0;   // 当前第几轮（0=block1, 1=block2, 2=block2重试...）
var match_pract_retries = 0; // block2重试次数

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

var practice_block_selfRed = {
  timeline: [
    // 指导语移到循环外面，确保只显示一次且不影响循环内 trial 的执行
    instruction_match_practice,
    {
      timeline: [
        // 1个block的trial（48 trials）
        {
          timeline: [fixation, match_RDK, feedbackTrial_match],
          timeline_variables: conditions_match_selfRed,
          repetitions: 12,
          randomize_order: true
        },
        // Block1 完成后显示过渡提示（match_pract_block 在 loop_function 中才递增，故此时仍为 0）
        {
          timeline: [instruction_block2_enter],
          conditional_function: function() { return match_pract_block === 0; }
        },
        // Block 2+ 完成后：达标显示完成提示，失败显示重试提示
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
          console.log("[match_practice] Passed!");
          return false;
        }
        // 未达标
        match_pract_retries++;
        console.log("[match_practice] Failed, retry", match_pract_retries);
        if (match_pract_retries >= 4) {
          alert("多次尝试后仍未达到90%的正确率，请联系主试。");
          return false;
        }
        return true;
      },
    }
  ],
};

var practice_block_selfBlue = {
  timeline: [
    // 指导语移到循环外面，确保只显示一次且不影响循环内 trial 的执行
    instruction_match_practice,
    {
      timeline: [
        {
          timeline: [fixation, match_RDK, feedbackTrial_match],
          timeline_variables: conditions_match_selfBlue,
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
          alert("多次尝试后仍未达到85%的正确率，请联系主试。");
          return false;
        }
        return true;
      },
    }
  ],
};

var practice_selfRed = {
  timeline: [practice_block_selfRed],
  conditional_function: function () {
    if (userId % 2 === 0) {
      console.log("match_selfRed");
      return true;
    } else {
      return false;
    }
  }
};

var practice_selfBlue = {
  timeline: [practice_block_selfBlue],
  conditional_function: function () {
    if (userId % 2 !== 0) {
      console.log("match_selfBlue");
      return true;
    } else {
      return false;
    }
  }
};

var practice_match = {
  timeline: [practice_selfRed, practice_selfBlue]
};

color.timeline.push(practice_match);

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

/*----------关联学习结束！下面是RDK颜色判断任务-----------*/

//指导语(包含开始，练习和结束)

var instruction_RDK_beginning = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
      <div style="text-align: left; color: white; padding: 10px"> 
        <h3 style="text-align: center; font-size: 30px; margin: 10px">接下来是：整体颜色判断任务</h3>
        <p>屏幕上会呈现一些运动的圆点，其中一定比例的点为 <span style="color: hsl(0, 50%, 50%)">红色</span> ，其余为 <span style="color: hsl(225, 50%, 50%)">蓝色</span>，</p>
        <p>您需要判断 <span style="font-weight: bold">散点图的整体颜色（即大多数点的颜色）是红色还是蓝色 </span>：</p >
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
  on_start: function() {
    currentBlock = 0
  },
  on_finish: function () {
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
  on_finish: function () {
    document.body.style.backgroundColor = "black";
  },
  data: {
    part: "instruction_RDk_formal_beginning"
  }
};


// 整体颜色判断任务

//整体颜色判断任务的不同条件

// 颜色辨别任务基础条件（任务相关），目标=颜色，通过 addShapeDifficulty 正交增加形状维度难度
var base_RDK_selfRed_core = [
  // target=color, association=self, easy, red-majority
  { target_color_proportion: 0.59, dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], difficulty: "easy", association: "self",
    coherent_direction: 0, coherence: 0, correct_value: "red", task_type: "relevant", data_part: "RDK_color" },
  // target=color, association=other, easy, blue-majority
  { target_color_proportion: 0.59, dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], difficulty: "easy", association: "other",
    coherent_direction: 0, coherence: 0, correct_value: "blue", task_type: "relevant", data_part: "RDK_color" }
];
var base_RDK_selfRed = addShapeDifficulty(base_RDK_selfRed_core);

var conditions_RDK_selfRed = generateDiscriminationConditions(base_RDK_selfRed, {
  "red": ["红", "蓝"],
  "blue": ["蓝", "红"]
});

var base_RDK_selfBlue_core = [
  // target=color, association=self, easy, blue-majority
  { target_color_proportion: 0.59, dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], difficulty: "easy", association: "self",
    coherent_direction: 0, coherence: 0, correct_value: "blue", task_type: "relevant", data_part: "RDK_color" },
  // target=color, association=other, easy, red-majority
  { target_color_proportion: 0.59, dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], difficulty: "easy", association: "other",
    coherent_direction: 0, coherence: 0, correct_value: "red", task_type: "relevant", data_part: "RDK_color" }
];
var base_RDK_selfBlue = addShapeDifficulty(base_RDK_selfBlue_core);

var conditions_RDK_selfBlue = generateDiscriminationConditions(base_RDK_selfBlue, {
  "red": ["红", "蓝"],
  "blue": ["蓝", "红"]
});

/* ==================== 任务重合条件（身份判断） ==================== */
// 被试判断散点图代表"我"还是"他/她"，根据关联维度推断身份
// 目标=颜色（身份），通过 addShapeDifficulty 正交增加形状维度难度
// selfRed（userId偶数）：红色=自我，蓝色=他人
var base_overlap_selfRed_core = [
  // self, easy (red=self, red-majority)
  { target_color_proportion: 0.59, dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], difficulty: "easy", association: "self",
    coherent_direction: 0, coherence: 0, correct_value: "self", task_type: "overlap", data_part: "RDK_overlap" },
  // other, easy (blue=other, blue-majority)
  { target_color_proportion: 0.59, dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], difficulty: "easy", association: "other",
    coherent_direction: 0, coherence: 0, correct_value: "other", task_type: "overlap", data_part: "RDK_overlap" }
];
var base_overlap_selfRed = addShapeDifficulty(base_overlap_selfRed_core);

// selfBlue（userId奇数）：蓝色=自我，红色=他人
var base_overlap_selfBlue_core = [
  // self, easy (blue=self, blue-majority)
  { target_color_proportion: 0.59, dot_color_final: ["hsl(225, 50%, 50%)", "hsl(0, 50%, 50%)"], difficulty: "easy", association: "self",
    coherent_direction: 0, coherence: 0, correct_value: "self", task_type: "overlap", data_part: "RDK_overlap" },
  // other, easy (red=other, red-majority)
  { target_color_proportion: 0.59, dot_color_final: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"], difficulty: "easy", association: "other",
    coherent_direction: 0, coherence: 0, correct_value: "other", task_type: "overlap", data_part: "RDK_overlap" }
];
var base_overlap_selfBlue = addShapeDifficulty(base_overlap_selfBlue_core);

var conditions_overlap_selfRed = generateDiscriminationConditions(base_overlap_selfRed, {
  "self": ["我", "他"],
  "other": ["他", "我"]
});

var conditions_overlap_selfBlue = generateDiscriminationConditions(base_overlap_selfBlue, {
  "self": ["我", "他"],
  "other": ["他", "我"]
});

// 统一的辨别任务 RDK 刺激（用于任务相关、任务无关、任务重合）
var RDK_discrimination = {
  type: jsPsychRdk,
  number_of_dots: 100,
  dot_color: ["hsl(0, 50%, 50%)", "hsl(225, 50%, 50%)"],
  choices: ["f", "j"],
  correct_choice: function () { return jsPsych.timelineVariable("correct_choice") }, 
  coherent_direction: function () { return jsPsych.timelineVariable("coherent_direction") },
  coherence: function () { return jsPsych.timelineVariable("coherence") },
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
    // 统一更新所有条件数组的 proportion/coherence
    updateProportion(conditions_RDK_selfRed);
    updateProportion(conditions_RDK_selfBlue);
    updateProportion(conditions_shape_selfRed);
    updateProportion(conditions_shape_selfBlue);
    if (typeof conditions_overlap_selfRed !== 'undefined') {
      updateProportion(conditions_overlap_selfRed);
      updateProportion(conditions_overlap_selfBlue);
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

// 以下保留别名以兼容现有 block 引用
var RDK = RDK_discrimination;

//练习阶段的任务

var practiceSet_RDK_selfRed = createPracticeSet(conditions_RDK_selfRed, 8);
var practice_block_RDK_selfRed = {
  timeline: [
    instruction_RDK_beginning,
    instruction_RDK_practice,
    {
      timeline: [fixation, RDK, feedbackTrial],
      timeline_variables: practiceSet_RDK_selfRed,
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

var practiceSet_RDK_selfBlue = createPracticeSet(conditions_RDK_selfBlue, 8);
var practice_block_RDK_selfBlue = {
  timeline: [
    instruction_RDK_beginning,
    instruction_RDK_practice,
    {
      timeline: [fixation, RDK, feedbackTrial],
      timeline_variables: practiceSet_RDK_selfBlue,
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

var practice_RDK_selfRed = {
  timeline: [practice_block_RDK_selfRed],
  conditional_function: function () {
    if (userId % 2 === 0) {
      console.log("practice_selfRed");
      return true;
    } else {
      return false;
    }
  }
};

var practice_RDK_selfBlue = {
  timeline: [practice_block_RDK_selfBlue],
  conditional_function: function () {
    if (userId % 2 !== 0) {
      console.log("practice_selfBlue");
      return true;
    } else {
      return false;
    }
  }
};


var practice_block_color = {
  timeline: [practice_RDK_selfRed, practice_RDK_selfBlue]
};

// color.timeline.push(practice_block_color); //这里不需要push，后面会统一push

//正式阶段的任务

//设置反馈

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

var formal_block_RDK_selfRed = {
  timeline: [
    instruction_RDK_formal_beginning,
    // Block 1
    {
      timeline: [fixation, RDK],
      timeline_variables: conditions_RDK_selfRed,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
    rest_rdk,
    // Block 2
    {
      timeline: [fixation, RDK],
      timeline_variables: conditions_RDK_selfRed,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
  ],
};

var formal_block_RDK_selfBlue = {
  timeline: [
    instruction_RDK_formal_beginning,
    // Block 1
    {
      timeline: [fixation, RDK],
      timeline_variables: conditions_RDK_selfBlue,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
    rest_rdk,
    // Block 2
    {
      timeline: [fixation, RDK],
      timeline_variables: conditions_RDK_selfBlue,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
  ],
};

var formal_RDK_selfRed = {
  timeline: [formal_block_RDK_selfRed],
  conditional_function: function () {
    if (userId % 2 === 0) {
      console.log("formal_selfRed");
      return true;
    } else {
      return false;
    }
  }
};

var formal_RDK_selfBlue = {
  timeline: [formal_block_RDK_selfBlue],
  conditional_function: function () {
    if (userId % 2 !== 0) {
      console.log("formal_selfBlue");
      return true;
    } else {
      return false;
    }
  }
};


var formal_block_color = {
  timeline: [formal_RDK_selfRed, formal_RDK_selfBlue]
};

//color.timeline.push(formal_block_color);

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
          <p>整体颜色为<span style="color: hsl(0, 50%, 50%)">红色</span>代表<span style="color: hsl(0, 50%, 50%)">你自己</span> ，为<span style="color: hsl(225, 50%, 50%)">蓝色</span>代表<span style="color: hsl(225, 50%, 50%)">他人</span>。</p >
          <p>您需要判断散点图代表的是<span style="font-weight: bold">您自己</span>还是<span style="font-weight: bold">他人</span>：</p>
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
          <p>整体颜色为<span style="color: hsl(225, 50%, 50%)">蓝色</span>代表<span style="color: hsl(225, 50%, 50%)">你自己</span> ，为<span style="color: hsl(0, 50%, 50%)">红色</span>代表<span style="color: hsl(0, 50%, 50%)">他人</span>。</p >
          <p>您需要判断散点图代表的是<span style="font-weight: bold">您自己</span>还是<span style="font-weight: bold">他人</span>：</p>
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
var practiceSet_overlap_selfRed = createPracticeSet(conditions_overlap_selfRed, 8);
var practice_block_overlap_selfRed = {
  timeline: [
    instruction_overlap, 
    instruction_RDK_practice,
    {
      timeline: [fixation, RDK_discrimination, feedbackTrial],
      timeline_variables: practiceSet_overlap_selfRed,
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

var practiceSet_overlap_selfBlue = createPracticeSet(conditions_overlap_selfBlue, 8);
var practice_block_overlap_selfBlue = {
  timeline: [
    instruction_overlap,
    instruction_RDK_practice,
    {
      timeline: [fixation, RDK_discrimination, feedbackTrial],
      timeline_variables: practiceSet_overlap_selfBlue,
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

var practice_overlap_selfRed = {
  timeline: [practice_block_overlap_selfRed],
  conditional_function: function () {
    return (userId % 2 === 0);
  }
};

var practice_overlap_selfBlue = {
  timeline: [practice_block_overlap_selfBlue],
  conditional_function: function () {
    return (userId % 2 !== 0);
  }
};

var practice_block_overlap = {
  timeline: [practice_overlap_selfRed, practice_overlap_selfBlue]
};

// 正式阶段
var formal_block_overlap_selfRed = {
  timeline: [
    instruction_RDK_formal_beginning,
    // Block 1
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_overlap_selfRed,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
    rest_rdk,
    // Block 2
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_overlap_selfRed,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
  ],
};

var formal_block_overlap_selfBlue = {
  timeline: [
    instruction_RDK_formal_beginning,
    // Block 1
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_overlap_selfBlue,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
    rest_rdk,
    // Block 2
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_overlap_selfBlue,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
  ],
};

var formal_overlap_selfRed = {
  timeline: [formal_block_overlap_selfRed],
  conditional_function: function () {
    return (userId % 2 === 0);
  }
};

var formal_overlap_selfBlue = {
  timeline: [formal_block_overlap_selfBlue],
  conditional_function: function () {
    return (userId % 2 !== 0);
  }
};

var formal_block_overlap = {
  timeline: [formal_overlap_selfRed, formal_overlap_selfBlue]
};

/*----------整体颜色判断任务结束！下面是形状判断任务-----------*/


//指导语(包含开始，练习和结束)

var instruction_motion_beginning = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div style="text-align: left; color: white; padding: 10px"> 
      <h3 style="text-align: center; font-size: 30px; margin: 10px">接下来是：形状判断任务</h3>
      <p>屏幕上会呈现一些彩色圆点，其中一定比例的点为 <span style="font-weight: bold">圆形</span>，其余为 <span style="font-weight: bold">正方形</span>，</p>
      <p>您需要判断 <span style="font-weight: bold">散点图中哪种形状的数量更多（即大多数点的形状）是圆形还是正方形</span></p >
      <p>散点图下方会显示"圆"和"方"的文字标签，</p>
      <ul>
        <li>若大多数点为 <span style="font-weight: bold">圆形</span>，请按对应文字标签所在侧的键（左侧按 <span style="font-weight: bold">F</span>，右侧按 <span style="font-weight: bold">J</span>）</li>
        <li>若大多数点为 <span style="font-weight: bold">正方形</span>，请按对应文字标签所在侧的键（左侧按 <span style="font-weight: bold">F</span>，右侧按 <span style="font-weight: bold">J</span>）</li>
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

var instruction_motion = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
  <div style="text-align: center; color: white; padding: 35px; font-size: 30px">
    <p>请把左手食指放在键盘 <span style="font-weight: bold">"F"键</span> 上，右手食指放在 <span style="font-weight: bold">"J"键</span> 上</p >
    <p>请按下空格键开始</p >
  </div>
  `,
  response_ends_trial: true,
  choices: " ",
  on_finish: function() {
    document.body.style.backgroundColor = "black";
  },
  data: {
    part: "instruction"
  }
};

// end 的指导语是一样的



// 形状辨别任务基础条件（任务无关），目标=形状，通过 addColorDifficulty 正交增加颜色维度难度（仅 easy）
// 注意：association 由 addColorDifficulty 根据颜色自动设置（selfRed: 红=self, 蓝=other）
var base_shape_selfRed_core = [
  // target=shape, easy, circle
  { dot_shape_ratio: 0.59, dot_shape: "circle", difficulty: "easy",
    coherent_direction: 0, coherence: 0, correct_value: "circle", task_type: "irrelevant", data_part: "RDK_shape" },
  // target=shape, easy, square
  { dot_shape_ratio: 0.59, dot_shape: "square", difficulty: "easy",
    coherent_direction: 0, coherence: 0, correct_value: "square", task_type: "irrelevant", data_part: "RDK_shape" }
];
// selfRed: 红=self, 蓝=other
var base_shape_selfRed = addColorDifficulty(base_shape_selfRed_core, "red");

// selfBlue（userId奇数）：蓝=self, 红=other
var base_shape_selfBlue_core = [
  // target=shape, easy, square
  { dot_shape_ratio: 0.59, dot_shape: "square", difficulty: "easy",
    coherent_direction: 0, coherence: 0, correct_value: "square", task_type: "irrelevant", data_part: "RDK_shape" },
  // target=shape, easy, circle
  { dot_shape_ratio: 0.59, dot_shape: "circle", difficulty: "easy",
    coherent_direction: 0, coherence: 0, correct_value: "circle", task_type: "irrelevant", data_part: "RDK_shape" }
];
// selfBlue: 蓝=self, 红=other
var base_shape_selfBlue = addColorDifficulty(base_shape_selfBlue_core, "blue");

// 直接生成完整条件数组（不再需要A/B分组）
var conditions_shape_selfRed = generateDiscriminationConditions(base_shape_selfRed, {
  "circle": ["圆", "方"],
  "square": ["方", "圆"]
});
var conditions_shape_selfBlue = generateDiscriminationConditions(base_shape_selfBlue, {
  "circle": ["圆", "方"],
  "square": ["方", "圆"]
});

// 形状辨别任务的练习和正式block

var practiceSet_shape_selfBlue = createPracticeSet(conditions_shape_selfBlue, 8);
var practice_block_shape_selfBlue = {
  timeline: [
    instruction_motion_beginning,
    instruction_motion,
    {
      timeline: [fixation, RDK_discrimination, feedbackTrial],
      timeline_variables: practiceSet_shape_selfBlue,
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

var practiceSet_shape_selfRed = createPracticeSet(conditions_shape_selfRed, 8);
var practice_block_shape_selfRed = {
  timeline: [
    instruction_motion_beginning,
    instruction_motion,
    {
      timeline: [fixation, RDK_discrimination, feedbackTrial],
      timeline_variables: practiceSet_shape_selfRed,
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

var practice_shape_selfBlue = {
  timeline: [practice_block_shape_selfBlue],
  conditional_function: function(){
    if (userId % 2 !== 0) {
      console.log("practice_shape_selfBlue");
      return true;
    } else {
      return false;
    }
  }
};

var practice_shape_selfRed = {
  timeline: [practice_block_shape_selfRed],
  conditional_function: function(){
    if (userId % 2 === 0) {
      console.log("practice_shape_selfRed");
      return true;
    } else {
      return false;
    }
  }
};

var practice_block_shape = { 
  timeline: [practice_shape_selfBlue, practice_shape_selfRed]
};

var formal_block_shape_selfBlue = {
  timeline: [
    instruction_RDK_formal_beginning,
    // Block 1
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_shape_selfBlue,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
    rest_rdk,
    // Block 2
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_shape_selfBlue,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
  ],
};

var formal_block_shape_selfRed = {
  timeline: [
    instruction_RDK_formal_beginning,
    // Block 1
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_shape_selfRed,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
    rest_rdk,
    // Block 2
    {
      timeline: [fixation, RDK_discrimination],
      timeline_variables: conditions_shape_selfRed,
      repetitions: 8,
      randomize_order: true
    },
    feedbackBlock_RDK,
  ],
};

var formal_shape_selfBlue = {
  timeline: [formal_block_shape_selfBlue],
  conditional_function: function(){
    if (userId % 2 !== 0) {
      console.log("formal_shape_selfBlue");
      return true;
    } else {
      return false;
    }
  }
};

var formal_shape_selfRed = {
  timeline: [formal_block_shape_selfRed],
  conditional_function: function(){
    if (userId % 2 === 0) {
      console.log("formal_shape_selfRed");
      return true;
    } else {
      return false;
    }
  }
};

var formal_block_shape = { 
  timeline: [formal_shape_selfBlue, formal_shape_selfRed]
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

color.timeline.push(block_RDK);

// over