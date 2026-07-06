/*
 * jspsych-staircase
 *
 * Author: Robin Bürkli <robuba.jr@gmx.ch>
 * License: MIT
 *
 * This file contains a helper to calculate cycle performance
 */
/**
 * Calculates performance in the previous cycle and suggests a new difficulty
 *
 * @param data A jsPsych data object containing the trials of interest
 * @param difficulty A difficulty object containing max, min, set and get fields
 * @param dataLabel The label which should be present on the trials of interest
 * @param targetAccuracy The desired target accuracy
 * @returns {CycleStats} An object containing the accuracy of the past cycle as
 * well as the adjusted difficulty
 */

var calculateCyclePerformance = function (data, difficulty, dataLabel, targetAccuracy, customDifficultyAdjuster) {
    // Calculate the difference between max and min
    var difficultyRange = difficulty.max - difficulty.min;
    // Grab all relevant trials according to dataLabel parameter
    var relevantTrials = data.filter({ data_label: dataLabel });
    // Count the correct responses
    var numberOfCorrectResponses = relevantTrials
        .filter({ correct: true })
        .count();
    // Calculate accuracy based on correct responses
    var accuracy = numberOfCorrectResponses / relevantTrials.count();
    var adjustedDifficulty;
    if (customDifficultyAdjuster) {
        adjustedDifficulty = customDifficultyAdjuster(difficulty, accuracy, targetAccuracy);
    }
    else {
        // Adjust difficulty by half the deviation from measured to target accuracy.
        // Example: If the measured accuracy is 20% higher than the target accuracy,
        // increase difficulty by 10%.
        adjustedDifficulty =
            difficulty.get() + ((accuracy - targetAccuracy) / 2) * difficultyRange;
            //difficulty.get() + (accuracy - targetAccuracy) * 0.5;
            //difficulty.get() - 0.02;
    }
    // Make sure we remain in the bounds
    if (difficulty.max > difficulty.min) {
        if (adjustedDifficulty > difficulty.max) {
            adjustedDifficulty = difficulty.max;
        }
        else if (adjustedDifficulty < difficulty.min) {
            adjustedDifficulty = difficulty.min;
        }
    }
    else if (difficulty.min > difficulty.max) {
        if (adjustedDifficulty > difficulty.min) {
            adjustedDifficulty = difficulty.min;
        }
        else if (adjustedDifficulty < difficulty.max) {
            adjustedDifficulty = difficulty.max;
        }
    }
    // Return a CycleStats object
    return {
        accuracy: accuracy,
        adjustedDifficulty: adjustedDifficulty,
    };
};

/*
 * jspsych-staircase
 *
 * Author: Robin Bürkli <robuba.jr@gmx.ch>
 * License: MIT
 *
 * This file contains tools which help to create a staircase method timeline for
 * a jsPsych experiment.
 */
/**
 * Generates a configurable jsPsych staircase method timeline
 *
 * @param conf The configuration object
 * @returns Timeline
 */
var generateStaircaseTimeline = function (conf) {
    // Initialize cycles counter
    var cyclesCarriedOut = 0;
    // Define the loop node
    var cycleLoop = {
        // Take the cycle provided and set it as the timeline to loop
        timeline: [conf.cycle],
        // Define the loop function (the above timeline is run once, and then this
        // function is run to evaluate whether the timeline should run once more)
        loop_function: function (data) {
            // Increment cycles counter
            cyclesCarriedOut++;
            // Was this the last cycle?
            var wasLastCycle = cyclesCarriedOut >= conf.numberOfCycles ? true : false;
            // Evaluate accuracy using a helper (defined below)
            var _a = calculateCyclePerformance(data, conf.difficulty, conf.dataLabel, conf.targetAccuracy), accuracy = _a.accuracy, adjustedDifficulty = _a.adjustedDifficulty;
            // Set the difficulty using the provided setter
            conf.difficulty.set(adjustedDifficulty);
            // Call back and notify about progress
            if (conf.postCycleCallback) {
                conf.postCycleCallback({
                    adjustedDifficulty: adjustedDifficulty,
                    cycleAccuracy: accuracy,
                    cyclesCarriedOut: cyclesCarriedOut,
                    finished: wasLastCycle,
                });
            }
            // If this was the last cycle, break the loop by returning false
            return wasLastCycle ? false : true;
        },
    };
    // Then return the loop node
    return cycleLoop;
};

//export { generateStaircaseTimeline };
window.generateStaircaseTimeline = generateStaircaseTimeline;