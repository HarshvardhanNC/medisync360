"""
MediSync360 Robust Structured Clinical Free-Form Symptom Parser (Assignment 6)

Converts natural-language patient descriptions into structured, rich clinical evidence:
- Canonical symptom resolution via SymptomOntology
- Assertion Status: present | absent | uncertain | historical
- Contextual Attributes: severity, duration, onset, frequency, location, trigger, temporal_pattern
- Subject & Entity Attribution: Patient vs. Family History vs. 3rd-Party vs. Pets
- Zero Hallucination: Unknown attributes are strictly preserved as 'UNKNOWN'
- Pre-compiled regexes for high-performance parsing (<5ms per narrative)
"""

import os
import sys
import re
from typing import Dict, List, Any, Optional, Set, Tuple

sys.path.append(os.path.dirname(__file__))
from symptom_ontology import SymptomOntology

class StructuredSymptomEvidence:
    def __init__(
        self,
        canonical_symptom: str,
        status: str = "present",
        severity: str = "UNKNOWN",
        duration: str = "UNKNOWN",
        onset: str = "UNKNOWN",
        frequency: str = "UNKNOWN",
        location: str = "UNKNOWN",
        trigger: str = "UNKNOWN",
        temporal_pattern: str = "UNKNOWN",
        subject: str = "patient",
        raw_phrase: str = "",
        associated_symptoms: Optional[List[str]] = None
    ):
        self.canonical_symptom = canonical_symptom
        self.status = status
        self.severity = severity
        self.duration = duration
        self.onset = onset
        self.frequency = frequency
        self.location = location
        self.trigger = trigger
        self.temporal_pattern = temporal_pattern
        self.subject = subject
        self.raw_phrase = raw_phrase
        self.associated_symptoms = associated_symptoms or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "canonical_symptom": self.canonical_symptom,
            "status": self.status,
            "severity": self.severity,
            "duration": self.duration,
            "onset": self.onset,
            "frequency": self.frequency,
            "location": self.location,
            "trigger": self.trigger,
            "temporal_pattern": self.temporal_pattern,
            "subject": self.subject,
            "raw_phrase": self.raw_phrase,
            "associated_symptoms": self.associated_symptoms
        }

class ClinicalSymptomParser:
    _instance: Optional["ClinicalSymptomParser"] = None

    def __init__(self):
        self.ontology = SymptomOntology.get_instance()
        self._add_common_clinical_aliases()
        self._init_regexes()

    @classmethod
    def get_instance(cls) -> "ClinicalSymptomParser":
        if cls._instance is None:
            cls._instance = ClinicalSymptomParser()
        return cls._instance

    def _add_common_clinical_aliases(self):
        extra_aliases = {
            "tired": "fatigue",
            "tiredness": "fatigue",
            "extremely tired": "fatigue",
            "no energy": "fatigue",
            "drained": "fatigue",
            "exhausted": "fatigue",
            "breathless": "breathlessness",
            "breathlessness": "breathlessness",
            "short of breath": "breathlessness",
            "out of breath": "breathlessness",
            "racing heart": "fast heart rate",
            "heart racing": "fast heart rate",
            "heart starts racing": "fast heart rate",
            "heart is racing": "fast heart rate",
            "heart is racing fast": "fast heart rate",
            "palpitations": "palpitations",
            "cold sweat": "sweating",
            "cold sweats": "sweating",
            "night sweats": "sweating",
            "sweating heavily": "sweating",
            "stomach hurts": "stomach pain",
            "tummy hurts": "stomach pain",
            "aching in my stomach": "stomach pain",
            "aching in stomach": "stomach pain",
            "abdominal ache": "abdominal pain",
            "pain in my chest": "chest pain",
            "pain in chest": "chest pain",
            "pain in my lower back": "back pain",
            "pain in lower back": "back pain",
            "burning feeling in my chest": "acidity",
            "burning feeling in chest": "acidity",
            "vomited": "vomiting",
            "vomited once": "vomiting",
            "threw up": "vomiting",
            "loose motions": "diarrhoea",
            "stuffy nose": "congestion",
            "blocked nose": "congestion",
            "sneezing fits": "continuous sneezing",
            "sore throat": "throat irritation",
            "pain behind eyes": "pain behind the eyes",
            "throbbing in my temples and head": "headache",
            "throbbing head": "headache",
            "severe headaches": "headache",
            "headaches": "headache",
            "room spinning": "spinning movements",
            "spinning": "spinning movements",
            "wobbly": "unsteadiness",
            "yellow eyes": "yellowing of eyes",
            "yellow skin": "yellowish skin",
            "skin has turned yellow": "yellowish skin",
            "skin turned yellow": "yellowish skin",
            "jaundice": "yellowish skin",
            "tea colored urine": "dark urine",
            "burning when peeing": "burning micturition",
            "burning sensation when peeing": "burning micturition",
            "burning urination": "burning micturition",
            "constant urge to pee": "continuous feel of urine",
            "frequent peeing": "polyuria",
            "frequent urination": "polyuria",
            "peeing a lot": "polyuria",
            "pimples": "pus filled pimples",
            "blisters": "blister",
            "blister": "blister",
            "chickenpox blisters": "blister",
            "chickenpox": "blister",
            "swelling in both knees": "swelling joints",
            "inflammation in joints": "joint pain",
            "discomfort in lower abdomen": "bladder discomfort"
        }
        for alias, canonical in extra_aliases.items():
            self.ontology.alias_to_canonical[alias] = canonical

    def _init_regexes(self):
        # Pre-compile negation cues
        self.negation_patterns = [
            re.compile(p, re.IGNORECASE) for p in [
                r'\b(?:no|not|neither|nor|without|never|denies|denied|free of|negative for|rule out)\b',
                r'\b(?:don\'t have|do not have|does not have|doesn\'t have|did not have|didn\'t have|have no|has no)\b',
                r'\b(?:experiencing no|no signs of|no evidence of|absent|zero)\b'
            ]
        ]

        # Pre-compile historical cues
        self.historical_patterns = [
            re.compile(p, re.IGNORECASE) for p in [
                r'\b(?:last month|last year|years ago|months ago|weeks ago|in the past|previously had|history of|had in childhood|in childhood|as a child|used to have|resolved)\b'
            ]
        ]

        # Pre-compile hypothetical / prospective cues
        self.hypothetical_patterns = [
            re.compile(p, re.IGNORECASE) for p in [
                r'\b(?:suppose|supposing|if i had|if i get|tomorrow|in the future|hypothetically)\b'
            ]
        ]

        # Pre-compile third party subjects
        self.third_party_patterns = [
            (re.compile(r'\b(?:my mother|my mom|my father|my dad|my parents|my brother|my sister|my sibling|my son|my daughter|my child|my kids|my wife|my husband|my spouse|my grandfather|my grandmother|my grandma|my grandpa|my cousin|my uncle|my aunt|family history of|runs in family)\b', re.IGNORECASE), 'family'),
            (re.compile(r'\b(?:my dog|my cat|my pet|my puppy|my kitten)\b', re.IGNORECASE), 'pet'),
            (re.compile(r'\b(?:my friend|my colleague|my coworker|my roommate|my neighbor|someone else)\b', re.IGNORECASE), 'third_party')
        ]

        # Temporal Duration patterns
        self.duration_regex = re.compile(
            r'\b(?:for\s+)?(?:the\s+past\s+|the\s+last\s+|about\s+|almost\s+|nearly\s+)?'
            r'(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a few|several|a)\s+'
            r'(day|days|week|weeks|month|months|hour|hours|year|years)\b|'
            r'\b(?:since\s+)(yesterday\s+morning|yesterday\s+night|yesterday|last\s+night|this\s+morning|last\s+week|a\s+few\s+days\s+ago|an\s+hour\s+ago)\b',
            re.IGNORECASE
        )

        self.severity_map = {
            "severe": ["severe", "severely", "excruciating", "unbearable", "terrible", "intense", "extreme", "extremely", "really bad", "heavy", "heavily", "crushing"],
            "mild": ["mild", "mildly", "slight", "slightly", "minor", "a bit", "little"],
            "moderate": ["moderate", "moderately", "fairly bad", "quite"]
        }

        self.onset_map = {
            "sudden": ["sudden", "suddenly", "abrupt", "abruptly", "acute", "out of nowhere", "all of a sudden"],
            "gradual": ["gradual", "gradually", "slowly developed", "progressive", "insidious"]
        }

        self.frequency_map = {
            "constant": ["constant", "constantly", "continuous", "continuously", "non-stop", "persistent", "all the time"],
            "intermittent": ["intermittent", "intermittently", "sometimes", "comes and goes", "occasional", "occasionally", "episodic", "now and then"],
            "frequent": ["frequent", "frequently", "often", "many times", "recurrent"]
        }

        self.location_map = {
            "left arm": ["radiating to left arm", "radiating to arm", "left arm", "left shoulder"],
            "chest": ["substernal", "breastbone", "in my chest", "in chest", "chest", "ribs", "pectoral"],
            "abdomen / stomach": ["in my stomach", "in stomach", "stomach", "abdomen", "abdominal", "belly", "tummy", "epigastric", "gut"],
            "lower abdomen": ["lower abdomen", "lower belly", "pelvic", "bladder area", "groin"],
            "head / temples": ["throbbing in my temples", "behind eyes", "temple", "temples", "forehead", "head", "cranium"],
            "neck": ["neck", "cervical", "throat"],
            "lower back": ["in my lower back", "in lower back", "lower back", "lumbar", "spine", "back"],
            "knees / legs": ["both knees", "knee", "knees", "calf", "calves", "legs", "lower limb", "feet", "foot"],
            "joints": ["joints", "joint", "knuckles", "elbow", "hip"]
        }

        self.trigger_map = {
            "exertion / physical activity": ["climbing stairs", "walking", "running", "exercise", "exercising", "physical activity", "exertion", "moving around", "working out"],
            "after eating / meals": ["after eating", "after meals", "when eating", "eating food", "fatty food", "spicy food", "post-prandial"],
            "bending over": ["bending over", "lying down", "when lying down", "stooping", "turning my head"],
            "cold exposure": ["cold weather", "cold air", "in the cold"],
            "stress": ["stress", "anxiety", "when nervous", "work stress"]
        }

        self.temporal_map = {
            "nocturnal / at night": ["at night", "night time", "during night", "nocturnal", "wakes me up at night", "sleeping"],
            "morning": ["in the morning", "upon waking", "morning stiffness", "wake up with"],
            "worsening": ["getting worse", "progressively worse", "worsening", "deteriorating"]
        }

        # Pre-compile compiled alias patterns (sorted longest first)
        self.compiled_aliases = [
            (re.compile(r'\b' + re.escape(alias) + r'\b', re.IGNORECASE), canonical)
            for alias, canonical in sorted(self.ontology.alias_to_canonical.items(), key=lambda x: len(x[0]), reverse=True)
        ]

        self.compiled_variants = [
            (re.compile(r'\b' + re.escape(var) + r'\b', re.IGNORECASE), canonical)
            for var, canonical in sorted(self.ontology.variant_to_canonical.items(), key=lambda x: len(x[0]), reverse=True)
        ]

    def parse(self, text: str) -> Dict[str, Any]:
        if not text or not isinstance(text, str) or not text.strip():
            return {
                "raw_text": str(text or ""),
                "total_extracted": 0,
                "present_symptoms": [],
                "absent_symptoms": [],
                "historical_symptoms": [],
                "uncertain_symptoms": [],
                "evidence_list": []
            }

        text_clean = " ".join(text.strip().split())
        sentence_delimiters = r'[.!?;\n]'
        raw_sentences = [s.strip() for s in re.split(sentence_delimiters, text_clean) if s.strip()]

        evidence_items: List[StructuredSymptomEvidence] = []
        seen_symptoms: Set[Tuple[str, str, str]] = set()

        for sentence in raw_sentences:
            self._parse_sentence(sentence, evidence_items, seen_symptoms)

        present = [e.canonical_symptom for e in evidence_items if e.status == "present" and e.subject == "patient"]
        absent = [e.canonical_symptom for e in evidence_items if e.status == "absent" and e.subject == "patient"]
        historical = [e.canonical_symptom for e in evidence_items if e.status == "historical" and e.subject == "patient"]
        uncertain = [e.canonical_symptom for e in evidence_items if e.status == "uncertain"]

        return {
            "raw_text": text_clean,
            "total_extracted": len(evidence_items),
            "present_symptoms": sorted(list(set(present))),
            "absent_symptoms": sorted(list(set(absent))),
            "historical_symptoms": sorted(list(set(historical))),
            "uncertain_symptoms": sorted(list(set(uncertain))),
            "evidence_list": [e.to_dict() for e in evidence_items]
        }

    def _parse_sentence(
        self,
        sentence: str,
        evidence_items: List[StructuredSymptomEvidence],
        seen_symptoms: Set[Tuple[str, str, str]]
    ):
        sent_duration = "UNKNOWN"
        dur_match = self.duration_regex.search(sentence)
        if dur_match:
            sent_duration = dur_match.group(0).strip()

        clause_delimiters = r'[,]|(?:\b(?:but|however|except|although|while|whereas|plus|as well as|and also|without)\b)'
        raw_clauses = re.split(clause_delimiters, sentence)

        for idx, clause in enumerate(raw_clauses):
            clause = clause.strip()
            if not clause:
                continue

            is_preceded_by_without = ("without " + clause.lower()) in sentence.lower()
            self._parse_clause(clause, sent_duration, evidence_items, seen_symptoms, force_negated=is_preceded_by_without)

    def _parse_clause(
        self,
        clause: str,
        inherited_duration: str,
        evidence_items: List[StructuredSymptomEvidence],
        seen_symptoms: Set[Tuple[str, str, str]],
        force_negated: bool = False
    ):
        clause_lower = clause.lower().strip()
        if not clause_lower:
            return

        subject = "patient"
        for pat_re, subj_type in self.third_party_patterns:
            if pat_re.search(clause_lower):
                subject = subj_type
                break

        is_negated = force_negated or any(pat_re.search(clause_lower) for pat_re in self.negation_patterns)
        is_historical = any(pat_re.search(clause_lower) for pat_re in self.historical_patterns)
        is_hypothetical = any(pat_re.search(clause_lower) for pat_re in self.hypothetical_patterns) and not re.search(r'\b(?:this|these|my active)\b', clause_lower)

        status = "present"
        if is_negated:
            status = "absent"
        elif is_historical:
            status = "historical"
        elif is_hypothetical:
            status = "uncertain"

        severity = self._extract_attribute(clause_lower, self.severity_map)
        onset = self._extract_attribute(clause_lower, self.onset_map)
        frequency = self._extract_attribute(clause_lower, self.frequency_map)
        location = self._extract_attribute(clause_lower, self.location_map)
        trigger = self._extract_attribute(clause_lower, self.trigger_map)
        temporal_pattern = self._extract_attribute(clause_lower, self.temporal_map)

        clause_duration = "UNKNOWN"
        dur_match = self.duration_regex.search(clause_lower)
        if dur_match:
            clause_duration = dur_match.group(0).strip()
        elif inherited_duration != "UNKNOWN":
            clause_duration = inherited_duration

        matched_canonicals: List[str] = []

        # Use pre-compiled regexes
        for pat_re, canonical in self.compiled_aliases:
            if pat_re.search(clause_lower):
                if canonical not in matched_canonicals:
                    matched_canonicals.append(canonical)

        if not matched_canonicals:
            for pat_re, canonical in self.compiled_variants:
                if pat_re.search(clause_lower):
                    if canonical not in matched_canonicals:
                        matched_canonicals.append(canonical)

        for sym in matched_canonicals:
            key = (sym, status, subject)
            if key not in seen_symptoms:
                seen_symptoms.add(key)
                assoc = [s for s in matched_canonicals if s != sym]

                evidence = StructuredSymptomEvidence(
                    canonical_symptom=sym,
                    status=status,
                    severity=severity,
                    duration=clause_duration,
                    onset=onset,
                    frequency=frequency,
                    location=location,
                    trigger=trigger,
                    temporal_pattern=temporal_pattern,
                    subject=subject,
                    raw_phrase=clause.strip(),
                    associated_symptoms=assoc
                )
                evidence_items.append(evidence)

    def _extract_attribute(self, text: str, mapping: Dict[str, List[str]]) -> str:
        best_match = "UNKNOWN"
        best_len = 0
        for attr_value, phrases in mapping.items():
            for phrase in phrases:
                if phrase in text:
                    if len(phrase) > best_len:
                        best_len = len(phrase)
                        best_match = attr_value
        return best_match
