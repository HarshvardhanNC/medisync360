"""
MediSync360 Safety & Red-Flag Triage Engine (Assignment 8 - Category A)

Evaluates clinical inputs for acute, life-threatening red-flag presentations requiring URGENT_ESCALATION.
Rules in this module ONLY evaluate safety triage. They NEVER assign arbitrary disease probabilities.
"""

import re
from typing import Dict, List, Any, Optional, Set, Tuple

class RedFlagAlert:
    def __init__(
        self,
        is_escalated: bool,
        triage_level: str = "ROUTINE",  # 'EMERGENCY', 'URGENT', 'ROUTINE'
        action: str = "ROUTINE_CARE",    # 'URGENT_ESCALATION', 'CLARIFY', 'ROUTINE_CARE'
        red_flags: Optional[List[str]] = None,
        clinical_rationale: str = "",
        recommended_specialist: str = "General Practitioner",
        urgency_level: str = "Low - Standard outpatient consultation",
        safety_guidance: str = ""
    ):
        self.is_escalated = is_escalated
        self.triage_level = triage_level
        self.action = action
        self.red_flags = red_flags or []
        self.clinical_rationale = clinical_rationale
        self.recommended_specialist = recommended_specialist
        self.urgency_level = urgency_level
        self.safety_guidance = safety_guidance

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_escalated": self.is_escalated,
            "triage_level": self.triage_level,
            "action": self.action,
            "red_flags": self.red_flags,
            "clinical_rationale": self.clinical_rationale,
            "recommended_specialist": self.recommended_specialist,
            "urgency_level": self.urgency_level,
            "safety_guidance": self.safety_guidance
        }

class SafetyRuleEngine:
    _instance: Optional["SafetyRuleEngine"] = None

    def __init__(self):
        self._init_safety_definitions()

    @classmethod
    def get_instance(cls) -> "SafetyRuleEngine":
        if cls._instance is None:
            cls._instance = SafetyRuleEngine()
        return cls._instance

    def _init_safety_definitions(self):
        self.red_flag_protocols = [
            {
                "id": "RF_ACS_CARDIAC",
                "name": "Acute Coronary Syndrome / Cardiac Red Flag",
                "required_any": [
                    {"crushing chest pain"},
                    {"chest pain", "sweating"},
                    {"chest pain", "shortness of breath"},
                    {"chest pain", "breathlessness"},
                    {"chest pain", "radiating to left arm"},
                    {"substernal chest pain"}
                ],
                "triage_level": "EMERGENCY",
                "specialist": "Emergency Medicine / Cardiologist",
                "urgency": "Emergency - Seek immediate emergency medical care (Call 911/112)",
                "rationale": "High-risk cardiac red flag (chest pain with dyspnea, diaphoresis, or arm radiation) suggests acute coronary syndrome or myocardial ischemia.",
                "guidance": "Do not drive yourself. Call local emergency medical services immediately."
            },
            {
                "id": "RF_STROKE_FAST",
                "name": "Acute Cerebrovascular Event (Stroke / FAST Red Flag)",
                "required_any": [
                    {"slurred speech", "facial drooping"},
                    {"weakness of one body side", "slurred speech"},
                    {"sudden weakness", "facial drooping"},
                    {"altered sensorium", "slurred speech"}
                ],
                "triage_level": "EMERGENCY",
                "specialist": "Emergency Medicine / Neurologist",
                "urgency": "Emergency - Seek immediate emergency medical care (Call 911/112)",
                "rationale": "Focal neurological deficit (FAST criteria) indicative of acute cerebral ischemia or intracranial hemorrhage.",
                "guidance": "Note the exact time symptoms started and seek emergency stroke care immediately."
            },
            {
                "id": "RF_COMA_UNRESPONSIVE",
                "name": "Altered Consciousness / Coma",
                "required_any": [
                    {"coma"},
                    {"unresponsive"},
                    {"loss of consciousness"}
                ],
                "triage_level": "EMERGENCY",
                "specialist": "Emergency Medicine / Critical Care",
                "urgency": "Emergency - Seek immediate emergency medical care (Call 911/112)",
                "rationale": "Severe impairment of consciousness indicates life-threatening neurological or systemic failure.",
                "guidance": "Ensure patient airway is clear and call emergency medical services immediately."
            },
            {
                "id": "RF_MASSIVE_HEMORRHAGE",
                "name": "Acute Severe Gastrointestinal Hemorrhage",
                "required_any": [
                    {"stomach bleeding"},
                    {"vomiting blood"},
                    {"blood in sputum", "high fever", "breathlessness"}
                ],
                "triage_level": "EMERGENCY",
                "specialist": "Emergency Medicine / Gastroenterologist",
                "urgency": "Emergency - Seek immediate emergency medical care (Call 911/112)",
                "rationale": "Active gastrointestinal or severe pulmonary hemorrhage with risk of hemodynamic shock.",
                "guidance": "Seek emergency medical evaluation immediately."
            },
            {
                "id": "RF_ACUTE_ABDOMEN",
                "name": "Acute Surgical Abdomen / Peritoneal Irritation",
                "required_any": [
                    {"lower right abdominal pain"},
                    {"rebound tenderness"}
                ],
                "triage_level": "EMERGENCY",
                "specialist": "General Surgeon / Emergency Medicine",
                "urgency": "Emergency - Seek immediate emergency medical care",
                "rationale": "Focal localized right iliac fossa pain with constitutional signs suggests acute appendicitis or surgical peritonitis.",
                "guidance": "Avoid eating or drinking and seek immediate urgent surgical assessment."
            },
            {
                "id": "RF_RESPIRATORY_FAILURE",
                "name": "Severe Acute Respiratory Distress",
                "required_any": [
                    {"breathlessness", "cough", "rusty sputum", "high fever"},
                    {"breathlessness", "chest pain", "fast heart rate"},
                    {"turning blue"},
                    {"gasping for air"},
                    {"severe difficulty breathing"}
                ],
                "triage_level": "EMERGENCY",
                "specialist": "Pulmonologist / Emergency Medicine",
                "urgency": "Emergency - Seek immediate emergency medical care",
                "rationale": "Severe acute respiratory distress with hypoxia, cyanosis, or gasping indicates critical airway compromise.",
                "guidance": "Administer emergency oxygen if available and call emergency services immediately."
            }
        ]

    def _is_phrase_positive(self, text: str, pattern_str: str) -> bool:
        """Helper to ensure phrase is present in positive, non-negated context."""
        for match in re.finditer(pattern_str, text):
            start = match.start()
            preceding = text[max(0, start - 35):start]
            if re.search(r'\b(?:no|not|denies|denied|without|never|neither|nor)\s+(?:any\s+)?$', preceding):
                continue
            return True
        return False

    def evaluate_safety(self, symptoms: List[str], raw_text: str = "") -> RedFlagAlert:
        all_cues: Set[str] = set(s.lower().strip() for s in symptoms)
        
        if raw_text:
            text_lower = raw_text.lower()
            cue_patterns = [
                (r'\bcrushing\s+chest\s+pain\b|\bcrushing\b', "crushing chest pain"),
                (r'\bradiating\s+to\s+(?:the\s+)?left\s+arm\b|\bradiat(?:ing|es)?\s+to\s+arm\b', "radiating to left arm"),
                (r'\bsubsternal\b', "substernal chest pain"),
                (r'\bshortness\s+of\s+breath\b', "shortness of breath"),
                (r'\bshortness\s+of\s+breath\b|\bbreathless(?:ness)?\b|\bbreathing\s+difficulty\b|\bdifficulty\s+breathing\b', "breathlessness"),
                (r'\bchest\s+pain\b', "chest pain"),
                (r'\bslurred\s+speech\b', "slurred speech"),
                (r'\bfacial\s+droop(?:ing)?\b|\bdrooping\s+face\b', "facial drooping"),
                (r'\bweakness\s+on\s+one\s+side\b|\bweakness\s+of\s+one\s+body\s+side\b|\bweakness\s+on\s+right\s+side\b', "weakness of one body side"),
                (r'\bunresponsive\b', "unresponsive"),
                (r'\bcoma\b|\bcomatose\b', "coma"),
                (r'\bvomiting\s+(?:large\s+volumes\s+of\s+)?(?:dark\s+)?blood\b', "vomiting blood"),
                (r'\blower\s+right\s+abdominal\s+pain\b|\bright\s+lower\s+abdomen\b', "lower right abdominal pain"),
                (r'\brebound\s+tenderness\b', "rebound tenderness"),
                (r'\bturning\s+blue\b|\bcyanosis\b', "turning blue"),
                (r'\bgasping\s+for\s+air\b|\bgasping\b|\bunable\s+to\s+speak\s+in\s+full\s+sentences\b', "gasping for air"),
                (r'\bcold\s+sweat\b|\bdiaphoresis\b|\bsweating\b', "sweating")
            ]

            for pat, cue_name in cue_patterns:
                if self._is_phrase_positive(text_lower, pat):
                    all_cues.add(cue_name)

        for protocol in self.red_flag_protocols:
            for required_set in protocol["required_any"]:
                if required_set.issubset(all_cues):
                    return RedFlagAlert(
                        is_escalated=True,
                        triage_level=protocol["triage_level"],
                        action="URGENT_ESCALATION",
                        red_flags=[protocol["name"]],
                        clinical_rationale=protocol["rationale"],
                        recommended_specialist=protocol["specialist"],
                        urgency_level=protocol["urgency"],
                        safety_guidance=protocol["guidance"]
                    )

        return RedFlagAlert(
            is_escalated=False,
            triage_level="ROUTINE",
            action="ROUTINE_CARE",
            red_flags=[],
            clinical_rationale="No acute emergency red-flags detected. Standard clinical assessment appropriate.",
            recommended_specialist="General Practitioner",
            urgency_level="Routine - Standard outpatient consultation",
            safety_guidance="Monitor your symptoms and consult a doctor if condition worsens."
        )
