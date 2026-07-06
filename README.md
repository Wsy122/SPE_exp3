# SPE Experiment 3 — Color Association

Self-prioritization effect (SPE) experiment using jsPsych v7.0.

## Usage

Open with participant ID as URL parameter:

```
https://Wsy122.github.io/SPE_exp3/?id=44
```

Test mode (shorter trials, 0% pass threshold):

```
https://Wsy122.github.io/SPE_exp3/?id=44&test=true
```

### Participant ID Rules

- **userId ≤ 35**: Shape-association group (圆形=自我, 正方形=他人)
- **userId > 35**: Color-association group (红色=自我, 蓝色=他人)
- **Even userId**: Red/Circle = self
- **Odd userId**: Blue/Square = self

## Data

When the experiment finishes, a CSV file and a JSON file are automatically downloaded.

## Task Structure

1. **Association learning** (匹配任务) — learn the self/other association
2. **Discrimination tasks** (辨别任务) in counterbalanced order:
   - Color judgment (任务相关/无关)
   - Shape judgment (任务相关/无关)
   - Identity/overlap judgment (任务重合)
