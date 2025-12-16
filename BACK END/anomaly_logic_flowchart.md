# Solar Anomaly Detection Logic - Visual Documentation

## How Each Anomaly Detection Works Step-by-Step

---

## 🔴 ANOMALY 1: Complete Panel Failure Detection

### Logic Flow

```
START
  ↓
┌─────────────────────────────────────┐
│ Get Current Data                    │
│ - Energy Generated                  │
│ - Current Time                      │
│ - Weather Data                      │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ QUESTION 1: Is it daytime?          │
│ Current Time between Sunrise-Sunset?│
└─────────────────────────────────────┘
  ↓              ↓
 YES            NO → END (Normal - nighttime)
  ↓
┌─────────────────────────────────────┐
│ QUESTION 2: Is there sunlight?      │
│ Solar Irradiance > 100 W/m²?        │
└─────────────────────────────────────┘
  ↓              ↓
 YES            NO → END (Too dark/cloudy)
  ↓
┌─────────────────────────────────────┐
│ QUESTION 3: Is generation zero?     │
│ Energy < 0.5% of panel capacity?    │
└─────────────────────────────────────┘
  ↓              ↓
 YES            NO → END (Panel working)
  ↓
┌─────────────────────────────────────┐
│ QUESTION 4: Is sky mostly clear?    │
│ Cloud Coverage < 90%?               │
└─────────────────────────────────────┐
  ↓              ↓
 YES            NO → END (Heavy clouds explain low generation)
  ↓
┌─────────────────────────────────────┐
│ QUESTION 5: Has this continued?     │
│ Zero generation for 3+ hours?       │
└─────────────────────────────────────┘
  ↓              ↓
 YES            NO → MONITOR (Wait for pattern)
  ↓
┌─────────────────────────────────────┐
│ 🚨 ALERT: COMPLETE PANEL FAILURE    │
│ Severity: CRITICAL                  │
│ Confidence: 95%                     │
│ Action: Immediate inspection needed │
└─────────────────────────────────────┘
```

### Real Example Scenarios

**✅ SCENARIO 1: Actual Failure Detected**
```
Input Data:
├── Time: 2:00 PM (14:00)
├── Sunrise: 6:30 AM, Sunset: 7:30 PM ✓ (Daytime)
├── Solar Irradiance: 750 W/m² ✓ (Good sunlight)
├── Cloud Coverage: 25% ✓ (Mostly clear)
├── Panel Capacity: 5 kW
└── Energy Generated: 0.02 kWh (0.4% of capacity) ✓ (Essentially zero)

Result:
✓ All checks pass → COMPLETE FAILURE DETECTED
Alert: "Panel failure - No generation despite good conditions"
```

**❌ SCENARIO 2: False Alarm Prevented**
```
Input Data:
├── Time: 2:00 PM (14:00)
├── Sunrise: 6:30 AM, Sunset: 7:30 PM ✓ (Daytime)
├── Solar Irradiance: 45 W/m² ✗ (Very low light)
├── Cloud Coverage: 95% ✗ (Heavy clouds)
├── Panel Capacity: 5 kW
└── Energy Generated: 0.01 kWh

Result:
✗ Irradiance too low → NO ALERT
Reason: "Low generation explained by weather conditions"
```

**❌ SCENARIO 3: Nighttime - No Alert**
```
Input Data:
├── Time: 10:00 PM (22:00)
├── Sunrise: 6:30 AM, Sunset: 7:30 PM ✗ (Nighttime)
├── Solar Irradiance: 0 W/m²
├── Panel Capacity: 5 kW
└── Energy Generated: 0 kWh

Result:
✗ Not daytime → NO ALERT
Reason: "Normal - solar panels don't work at night"
```

---

## 🟠 ANOMALY 2: Panel Degradation Detection

### Logic Flow

```
START
  ↓
┌─────────────────────────────────────┐
│ Collect Data for Analysis           │
│ - Current generation                │
│ - Weather conditions                │
│ - Historical baseline (30+ days)    │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ STEP 1: Calculate Expected          │
│ Generation                          │
│                                     │
│ Expected = Capacity × (Irradiance/1000) │
│          × Efficiency × Temp_Factor │
│                                     │
│ Example:                            │
│ 5kW × (800/1000) × 0.18 × 0.96     │
│ = 0.69 kWh                          │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ STEP 2: Calculate Performance Ratio │
│                                     │
│ Performance = (Actual/Expected)×100 │
│                                     │
│ Example: (0.45/0.69) × 100 = 65%   │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ STEP 3: Get Historical Performance  │
│ for Similar Conditions              │
│                                     │
│ Find past days with:                │
│ - Similar irradiance (±100 W/m²)   │
│ - Similar temperature (±5°C)        │
│ - Similar cloud coverage (±15%)     │
│                                     │
│ Calculate median performance: 88%   │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ STEP 4: Calculate Degradation      │
│                                     │
│ Degradation = Historical - Current  │
│ 88% - 65% = 23% degradation        │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ QUESTION 1: Significant degradation?│
│ Degradation > 15%?                  │
└─────────────────────────────────────┘
  ↓              ↓
 YES            NO → END (Normal variation)
  ↓
┌─────────────────────────────────────┐
│ STEP 5: Statistical Validation      │
│                                     │
│ Calculate Z-Score:                  │
│ Z = (Current - Mean) / Std Dev      │
│ Z = (65 - 88) / 8 = -2.875         │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ QUESTION 2: Statistically significant?│
│ |Z-Score| > 2.0?                    │
│ (95% confidence)                    │
└─────────────────────────────────────┘
  ↓              ↓
 YES            NO → MONITOR (Borderline case)
  ↓
┌─────────────────────────────────────┐
│ STEP 6: Analyze Trend               │
│                                     │
│ Check last 14 days:                 │
│ Day 1-7:  85% avg performance       │
│ Day 8-14: 68% avg performance       │
│                                     │
│ Trend: Declining ✓                  │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ QUESTION 3: Consistent decline?     │
│ Trend shows continuous decrease?    │
└─────────────────────────────────────┘
  ↓              ↓
 YES            NO → MONITOR (Isolated incident)
  ↓
┌─────────────────────────────────────┐
│ 🚨 ALERT: PANEL DEGRADATION         │
│ Severity: HIGH (23% degradation)    │
│ Confidence: 82%                     │
│ Action: Schedule maintenance        │
└─────────────────────────────────────┘
```

### Real Example Scenarios

**✅ SCENARIO 1: Actual Degradation Detected**
```
Day 1 Data (2 weeks ago):
├── Expected Generation: 0.70 kWh
├── Actual Generation: 0.62 kWh
├── Performance Ratio: 88%
└── Status: Normal

Current Day Data:
├── Expected Generation: 0.68 kWh (similar conditions)
├── Actual Generation: 0.44 kWh
├── Performance Ratio: 65%
├── Degradation: 23%
└── Z-Score: -2.9 (highly significant)

14-Day Trend:
Week 1 Average: 85%
Week 2 Average: 67%
└── Trend: Declining ✓

Result:
✓ Significant degradation detected
Alert: "Panel efficiency dropped 23%. Inspection recommended."
```

**❌ SCENARIO 2: Weather Variation - No Alert**
```
Day 1: Clear Sky
├── Irradiance: 900 W/m²
├── Performance: 90%
└── Status: Excellent

Current Day: Partially Cloudy
├── Irradiance: 600 W/m² (different conditions)
├── Performance: 65%
├── Similar Historical Days: 63-68% typical
├── Degradation: Only 3% below expected for these conditions
└── Z-Score: -0.5 (not significant)

Result:
✗ Not significant → NO ALERT
Reason: "Performance normal for current weather conditions"
```

---

## 🔵 ANOMALY 3: Weather-Related Low Generation

### Logic Flow

```
START
  ↓
┌─────────────────────────────────────┐
│ Get Current Readings                │
│ - Energy Generated                  │
│ - Weather Data (irradiance, clouds, │
│   precipitation, visibility)        │
│ - Clear-Sky Baseline                │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ STEP 1: Calculate Weather Severity  │
│                                     │
│ Factors:                            │
│ ├─ Cloud Coverage: 75% × 0.7 = 52% │
│ ├─ Precipitation: 5mm × 20 = 100%  │
│ │   (capped at 80%)               │
│ └─ Visibility: (10-8km) × 5 = 10%  │
│                                     │
│ Total Weather Impact: 52+80+10=142%│
│ (capped at 90%)                    │
│ Final: 90% reduction expected       │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ STEP 2: Calculate Actual Reduction  │
│                                     │
│ Clear-Sky Baseline: 3.5 kWh         │
│ Current Generation: 0.4 kWh         │
│                                     │
│ Actual Reduction:                   │
│ (3.5 - 0.4) / 3.5 × 100 = 88%      │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ STEP 3: Compare Expected vs Actual  │
│                                     │
│ Expected Reduction: 90%             │
│ Actual Reduction: 88%               │
│ Difference: 2%                      │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ QUESTION 1: Does weather explain it?│
│ Difference < 20%?                   │
└─────────────────────────────────────┘
  ↓              ↓
 YES            NO → Check Panel Issue
  ↓              ↓
┌─────────────────────────────────────┐
│ QUESTION 2: Is weather severe?      │
│ Weather Severity > 40%?             │
└─────────────────────────────────────┘
  ↓              ↓
 YES            NO → END (Normal operation)
  ↓
┌─────────────────────────────────────┐
│ ✓ CLASSIFICATION: Weather-Related   │
│ Severity: LOW                       │
│ Confidence: 85%                     │
│ Action: No action needed            │
│ Note: "Low generation due to heavy  │
│       rain and clouds"              │
└─────────────────────────────────────┘

                ↓ (from NO branch)
┌─────────────────────────────────────┐
│ Panel Issue Path:                   │
│                                     │
│ Weather severe BUT generation       │
│ much lower than expected            │
│                                     │
│ Expected Reduction: 40%             │
│ Actual Reduction: 75%               │
│ Difference: 35% (too large!)        │
│                                     │
│ ⚠️ CLASSIFICATION: Combined Issue   │
│ Severity: MEDIUM                    │
│ Confidence: 70%                     │
│ Action: Inspect panels              │
│ Note: "Generation lower than        │
│       weather alone can explain"    │
└─────────────────────────────────────┘
```

### Real Example Scenarios

**✅ SCENARIO 1: Weather Correctly Identified**
```
Current Conditions:
├── Cloud Coverage: 85%
├── Precipitation: 8mm/hour (heavy rain)
├── Solar Irradiance: 120 W/m²
├── Visibility: 3km (poor)
└── Clear-Sky Baseline: 4.0 kWh

Weather Impact Calculation:
├── Cloud Effect: 85% × 0.7 = 59.5%
├── Rain Effect: min(8×20, 80) = 80%
├── Visibility Effect: (10-3)×5 = 35%
└── Total Expected Reduction: min(59.5+80+35, 90) = 90%

Actual Performance:
├── Current Generation: 0.45 kWh
├── Actual Reduction: (4.0-0.45)/4.0 = 89%
└── Match: 90% expected vs 89% actual ✓

Result:
✓ Weather fully explains low generation
Classification: "WEATHER_RELATED - No panel issue"
```

**⚠️ SCENARIO 2: Panel Issue Despite Weather**
```
Current Conditions:
├── Cloud Coverage: 45% (moderate)
├── Precipitation: 0mm
├── Solar Irradiance: 550 W/m²
├── Visibility: 10km (good)
└── Clear-Sky Baseline: 3.8 kWh

Weather Impact Calculation:
├── Cloud Effect: 45% × 0.7 = 31.5%
├── Rain Effect: 0%
├── Visibility Effect: 0%
└── Total Expected Reduction: 31.5%

Actual Performance:
├── Current Generation: 0.9 kWh
├── Actual Reduction: (3.8-0.9)/3.8 = 76%
└── Mismatch: 31.5% expected vs 76% actual ✗

Result:
✗ Weather doesn't explain the full reduction
Classification: "COMBINED_ISSUE - Panel problem suspected"
Alert: "Generation 45% lower than weather conditions suggest"
```

---

## 🟡 ANOMALY 4: Sensor Malfunction Detection

### Logic Flow

```
START
  ↓
┌─────────────────────────────────────┐
│ Run Multiple Sensor Checks          │
│ (All run in parallel)               │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ CHECK 1: Night Generation           │
│                                     │
│ Is current time outside sunrise-    │
│ sunset window?                      │
│   AND                               │
│ Solar Irradiance < 10 W/m²?         │
│   AND                               │
│ Energy Generated > 0.01 kWh?        │
│                                     │
│ If YES → SENSOR ERROR               │
│ Confidence: 98%                     │
│ Reason: "Physically impossible"     │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ CHECK 2: Exceeds Capacity           │
│                                     │
│ Is Energy Generated > Panel Capacity│
│ × 1.05?                             │
│                                     │
│ Example:                            │
│ Panel: 5 kW                         │
│ Generated: 5.8 kWh                  │
│ 5.8 > 5.25 (5×1.05) → YES          │
│                                     │
│ If YES → SENSOR ERROR               │
│ Confidence: 99%                     │
│ Reason: "Exceeds physical limit"    │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ CHECK 3: Stuck Sensor               │
│                                     │
│ Get last 10 readings:               │
│ [2.3, 2.3, 2.3, 2.3, 2.3, 2.3,     │
│  2.3, 2.3, 2.3, 2.3]               │
│                                     │
│ Are all values identical for 6+     │
│ consecutive hours?                  │
│                                     │
│ If YES → SENSOR ERROR               │
│ Confidence: 90%                     │
│ Reason: "Sensor stuck at same value"│
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ CHECK 4: Erratic Readings           │
│                                     │
│ Get last 10 readings:               │
│ [0.2, 3.8, 0.1, 4.2, 0.3, 3.9]     │
│                                     │
│ Calculate Coefficient of Variation: │
│ CV = Std Dev / Mean                 │
│                                     │
│ Example:                            │
│ Mean: 2.1, Std Dev: 1.8            │
│ CV = 1.8/2.1 = 0.86 (high)         │
│                                     │
│ Is CV > 1.5?                        │
│                                     │
│ If YES → SENSOR WARNING             │
│ Confidence: 75%                     │
│ Reason: "Unstable sensor readings"  │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ CHECK 5: Negative Values            │
│                                     │
│ Is Energy Generated < 0?            │
│                                     │
│ If YES → SENSOR ERROR               │
│ Confidence: 100%                    │
│ Reason: "Impossible negative energy"│
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ Any Errors Found?                   │
└─────────────────────────────────────┘
  ↓              ↓
 YES            NO → END (Sensor OK)
  ↓
┌─────────────────────────────────────┐
│ 🚨 ALERT: SENSOR MALFUNCTION        │
│                                     │
│ Select highest severity issue       │
│ Report all detected problems        │
│ Action: Calibrate or replace sensor │
└─────────────────────────────────────┘
```

### Real Example Scenarios

**✅ SCENARIO 1: Night Generation (Impossible)**
```
Input Data:
├── Time: 11:30 PM (23:30)
├── Sunrise: 6:45 AM
├── Sunset: 7:15 PM
├── Solar Irradiance: 0 W/m² ✓ (Confirms nighttime)
├── Energy Generated: 1.2 kWh ✗ (IMPOSSIBLE!)

Analysis:
├── Is nighttime? YES ✓
├── No sunlight? YES ✓
├── Showing generation? YES ✓
└── Result: PHYSICALLY IMPOSSIBLE

Alert:
🚨 CRITICAL - Sensor Malfunction
"Solar panel showing 1.2 kWh generation at night (11:30 PM)
This is physically impossible. Sensor requires immediate attention."
Confidence: 98%
```

**✅ SCENARIO 2: Stuck Sensor**
```
Last 12 Hours of Data:
Time  | Generation
------|------------
06:00 | 0.15 kWh
07:00 | 0.45 kWh
08:00 | 1.23 kWh
09:00 | 1.23 kWh ← Same
10:00 | 1.23 kWh ← Same
11:00 | 1.23 kWh ← Same
12:00 | 1.23 kWh ← Same
13:00 | 1.23 kWh ← Same (6 hours identical!)
14:00 | 1.23 kWh ← Same
15:00 | 1.23 kWh ← Same

Analysis:
├── Unique values in last 10 readings: 1
├── Consecutive identical: 8 hours
├── Weather changed during period? YES
│   (clouds came at 11 AM, cleared at 2 PM)
└── Generation unchanged? YES (abnormal)

Alert:
🚨 HIGH - Sensor Stuck
"Sensor reporting identical value (1.23 kWh) for 8 consecutive hours
despite changing weather conditions."
Confidence: 90%
```

**✅ SCENARIO 3: Exceeds Capacity**
```
System Specifications:
├── Panel Capacity: 5.0 kW
├── Theoretical Max Output: 5.0 kWh/hour
└── Tolerance Buffer: 5% = 5.25 kWh max

Current Reading:
├── Time: 1:00 PM (peak sun)
├── Solar Irradiance: 950 W/m²
├── Energy Generated: 6.8 kWh ✗

Analysis:
├── Is 6.8 > 5.25 (capacity × 1.05)? YES
├── Excess: 6.8 - 5.25 = 1.55 kWh (30% over limit)
└── Physically possible? NO

Alert:
🚨 CRITICAL - Sensor Malfunction
"Sensor reporting 6.8 kWh from a 5.0 kW system (136% of capacity).
This exceeds physical limits. Sensor calibration required."
Confidence: 99%
```

**✅ SCENARIO 4: Erratic Fluctuations**
```
Last 8 Hours (Stable Weather):
Time  | Generation | Weather
------|------------|----------
09:00 | 2.1 kWh    | Clear, 850 W/m²
10:00 | 0.3 kWh    | Clear, 880 W/m² (sudden drop!)
11:00 | 3.8 kWh    | Clear, 900 W/m² (sudden spike!)
12:00 | 0.5 kWh    | Clear, 920 W/m² (sudden drop!)
13:00 | 4.1 kWh    | Clear, 910 W/m² (sudden spike!)
14:00 | 0.8 kWh    | Clear, 890 W/m² (sudden drop!)

Statistical Analysis:
├── Mean: 1.93 kWh
├── Std Dev: 1.62 kWh
├── Coefficient of Variation: 1.62/1.93 = 0.84
├── Weather stable? YES
└── Generation erratic? YES (high CV)

Alert:
⚠️ MEDIUM - Erratic Sensor
"Sensor showing wild fluctuations (CV=0.84) despite stable weather.
Possible loose connection or sensor degradation."
Confidence: 75%
```

---

## 📊 Decision Matrix Summary

| Anomaly Type | Key Indicators | Confidence Required | Action Priority |
|--------------|----------------|---------------------|-----------------|
| **Complete Failure** | Zero generation during sun, 3+ hours | 95% | CRITICAL (0-4 hours) |
| **Degradation** | 15%+ below baseline, statistical significance | 70-85% | HIGH (24 hours) |
| **Weather Issue** | Generation matches weather severity | 80% | LOW (Info only) |
| **Sensor Error** | Physical impossibilities | 90-99% | CRITICAL (0-4 hours) |

---

## 🔄 Complete Detection Pipeline Flow

```
NEW DATA ARRIVES
       ↓
   VALIDATE DATA
   (Nulls, format, range)
       ↓
   ┌────────────────┐
   │ SENSOR CHECKS  │ ← Always First!
   │ (Physical Laws)│
   └────────────────┘
       ↓
   Sensor OK?
       ↓           ↓
     YES          NO → STOP & ALERT
       ↓                (Sensor Issue)
   ┌────────────────┐
   │ FAILURE CHECK  │
   │ (Zero Gen)     │
   └────────────────┘
       ↓
   Complete Failure?
       ↓           ↓
      NO          YES → STOP & ALERT
       ↓                (Critical)
   ┌────────────────┐
   │ WEATHER CHECK  │
   │ (Correlation)  │
   └────────────────┘
       ↓
   Weather Explains?
       ↓           ↓
      NO          YES → LOG & CONTINUE
       ↓                (No action)
   ┌────────────────┐
   │ DEGRADATION    │
   │ CHECK          │
   │ (Trend)        │
   └────────────────┘
       ↓
   Degrading?
       ↓           ↓
     YES          NO → END (Normal)
       ↓
   ALERT & SCHEDULE
   MAINTENANCE
```

---

## 💡 Key Takeaways

1. **Sensor checks ALWAYS run first** - If sensors are bad, other checks are meaningless
2. **Weather validation is essential** - Prevents false alarms on cloudy days
3. **Statistical validation prevents false positives** - Requires significance testing
4. **Confidence scores guide actions** - Higher confidence = faster response
5. **Context matters** - Same reading means different things at different times/weather

This logic ensures reliable, accurate anomaly detection with minimal false alarms.