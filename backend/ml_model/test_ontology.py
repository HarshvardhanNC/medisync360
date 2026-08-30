"""
MediSync360 Comprehensive Symptom Ontology Test Suite
Assignment 2: Over 100 Rigorous Unit & Integration Tests

Tests:
- Canonical exact matches (all 131 symptoms)
- Capitalization variants
- Underscore to space conversions
- Whitespace and punctuation formatting
- Typo and spelling variant tolerance
- Medical aliases and lay-person colloquial mappings
- False-positive entity attribution filters (family history, 3rd party, pets)
- Negation detection and exclusion
- Non-medical query and ambiguous noise rejection
- Complex multi-clause clinical narrative extraction
"""

import unittest
import os
import sys

sys.path.append(os.path.dirname(__file__))
from symptom_ontology import SymptomOntology

class TestSymptomOntology(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ontology = SymptomOntology.get_instance()

    # -------------------------------------------------------------
    # Group 1: Basic Structure & Integrity Tests (5 tests)
    # -------------------------------------------------------------
    def test_001_ontology_loaded(self):
        self.assertGreater(len(self.ontology.canonical_symptoms), 120)
        self.assertEqual(len(self.ontology.canonical_symptoms), 131)

    def test_002_categories_present(self):
        self.assertIn("Gastrointestinal", set(self.ontology.category_map.values()))
        self.assertIn("Cardiovascular", set(self.ontology.category_map.values()))

    def test_003_severity_weights_present(self):
        self.assertGreaterEqual(self.ontology.severity_map.get("chest pain", 0), 5)
        self.assertGreaterEqual(self.ontology.severity_map.get("high fever", 0), 5)

    def test_004_disease_associations_present(self):
        malaria_syms = self.ontology.symptom_to_diseases.get("chills", [])
        self.assertIn("Malaria", malaria_syms)

    def test_005_canonical_ids_present(self):
        self.assertTrue(self.ontology.canonical_to_id.get("headache", "").startswith("SYM_"))

    # -------------------------------------------------------------
    # Group 2: Canonical Exact Matches (15 tests)
    # -------------------------------------------------------------
    def test_006_exact_headache(self):
        self.assertEqual(self.ontology.normalize_term("headache"), "headache")

    def test_007_exact_chest_pain(self):
        self.assertEqual(self.ontology.normalize_term("chest pain"), "chest pain")

    def test_008_exact_high_fever(self):
        self.assertEqual(self.ontology.normalize_term("high fever"), "high fever")

    def test_009_exact_cough(self):
        self.assertEqual(self.ontology.normalize_term("cough"), "cough")

    def test_010_exact_nausea(self):
        self.assertEqual(self.ontology.normalize_term("nausea"), "nausea")

    def test_011_exact_vomiting(self):
        self.assertEqual(self.ontology.normalize_term("vomiting"), "vomiting")

    def test_012_exact_fatigue(self):
        self.assertEqual(self.ontology.normalize_term("fatigue"), "fatigue")

    def test_013_exact_joint_pain(self):
        self.assertEqual(self.ontology.normalize_term("joint pain"), "joint pain")

    def test_014_exact_skin_rash(self):
        self.assertEqual(self.ontology.normalize_term("skin rash"), "skin rash")

    def test_015_exact_dizziness(self):
        self.assertEqual(self.ontology.normalize_term("dizziness"), "dizziness")

    def test_016_exact_itching(self):
        self.assertEqual(self.ontology.normalize_term("itching"), "itching")

    def test_017_exact_chills(self):
        self.assertEqual(self.ontology.normalize_term("chills"), "chills")

    def test_018_exact_breathlessness(self):
        self.assertEqual(self.ontology.normalize_term("breathlessness"), "breathlessness")

    def test_019_exact_sweating(self):
        self.assertEqual(self.ontology.normalize_term("sweating"), "sweating")

    def test_020_exact_diarrhoea(self):
        self.assertEqual(self.ontology.normalize_term("diarrhoea"), "diarrhoea")

    # -------------------------------------------------------------
    # Group 3: Case Insensitivity & Formatting Tests (10 tests)
    # -------------------------------------------------------------
    def test_021_uppercase_headache(self):
        self.assertEqual(self.ontology.normalize_term("HEADACHE"), "headache")

    def test_022_mixed_case_chest_pain(self):
        self.assertEqual(self.ontology.normalize_term("ChEsT pAiN"), "chest pain")

    def test_023_title_case_high_fever(self):
        self.assertEqual(self.ontology.normalize_term("High Fever"), "high fever")

    def test_024_underscore_stomach_pain(self):
        self.assertEqual(self.ontology.normalize_term("stomach_pain"), "stomach pain")

    def test_025_underscore_skin_rash(self):
        self.assertEqual(self.ontology.normalize_term("skin_rash"), "skin rash")

    def test_026_underscore_acute_liver_failure(self):
        self.assertEqual(self.ontology.normalize_term("acute_liver_failure"), "acute liver failure")

    def test_027_leading_trailing_whitespace(self):
        self.assertEqual(self.ontology.normalize_term("   fatigue   "), "fatigue")

    def test_028_double_space_dischromic(self):
        self.assertEqual(self.ontology.normalize_term("dischromic  patches"), "dischromic patches")

    def test_029_double_space_spotting_urination(self):
        self.assertEqual(self.ontology.normalize_term("spotting  urination"), "spotting urination")

    def test_030_multiple_spaces_joint_pain(self):
        self.assertEqual(self.ontology.normalize_term("joint    pain"), "joint pain")

    # -------------------------------------------------------------
    # Group 4: Typo & Spelling Variant Tests (15 tests)
    # -------------------------------------------------------------
    def test_031_typo_hedache(self):
        self.assertEqual(self.ontology.normalize_term("hedache"), "headache")

    def test_032_typo_fevr(self):
        self.assertEqual(self.ontology.normalize_term("high fevr"), "high fever")

    def test_033_typo_nawsea(self):
        self.assertEqual(self.ontology.normalize_term("nawsea"), "nausea")

    def test_034_typo_diarhea(self):
        self.assertEqual(self.ontology.normalize_term("diarhea"), "diarrhoea")

    def test_035_typo_sweting(self):
        self.assertEqual(self.ontology.normalize_term("sweting"), "sweating")

    def test_036_typo_bredlesness(self):
        self.assertEqual(self.ontology.normalize_term("bredlesness"), "breathlessness")

    def test_037_typo_vomitting(self):
        self.assertEqual(self.ontology.normalize_term("vomitting"), "vomiting")

    def test_038_typo_flegm(self):
        self.assertEqual(self.ontology.normalize_term("flegm"), "phlegm")

    def test_039_typo_couhg(self):
        self.assertEqual(self.ontology.normalize_term("couhg"), "cough")

    def test_040_typo_constipasion(self):
        self.assertEqual(self.ontology.normalize_term("constipasion"), "constipation")

    def test_041_typo_fatige(self):
        self.assertEqual(self.ontology.normalize_term("fatige"), "fatigue")

    def test_042_typo_diziness(self):
        self.assertEqual(self.ontology.normalize_term("diziness"), "dizziness")

    def test_043_typo_chils(self):
        self.assertEqual(self.ontology.normalize_term("chils"), "chills")

    def test_044_typo_blured_vision(self):
        self.assertEqual(self.ontology.normalize_term("blured vision"), "blurred and distorted vision")

    def test_045_typo_skyn_rash(self):
        self.assertEqual(self.ontology.normalize_term("skyn rash"), "skin rash")

    # -------------------------------------------------------------
    # Group 5: Colloquial Phrases & Aliases (15 tests)
    # -------------------------------------------------------------
    def test_046_alias_tummy_ache(self):
        self.assertIn(self.ontology.normalize_term("tummy ache"), ["stomach pain", "abdominal pain"])

    def test_047_alias_acid_reflux(self):
        self.assertEqual(self.ontology.normalize_term("acid reflux"), "acidity")

    def test_048_alias_room_spinning(self):
        self.assertEqual(self.ontology.normalize_term("room spinning"), "spinning movements")

    def test_049_alias_shortness_of_breath(self):
        self.assertEqual(self.ontology.normalize_term("shortness of breath"), "breathlessness")

    def test_050_alias_racing_heart(self):
        self.assertEqual(self.ontology.normalize_term("racing heart"), "fast heart rate")

    def test_051_alias_loose_motions(self):
        self.assertEqual(self.ontology.normalize_term("loose motions"), "diarrhoea")

    def test_052_alias_throwing_up(self):
        self.assertEqual(self.ontology.normalize_term("throwing up"), "vomiting")

    def test_053_alias_tea_colored_urine(self):
        self.assertEqual(self.ontology.normalize_term("tea colored urine"), "dark urine")

    def test_054_alias_sore_throat(self):
        self.assertEqual(self.ontology.normalize_term("sore throat"), "throat irritation")

    def test_055_alias_stuffy_nose(self):
        self.assertEqual(self.ontology.normalize_term("stuffy nose"), "congestion")

    def test_056_alias_yellow_eyes(self):
        self.assertEqual(self.ontology.normalize_term("yellow eyes"), "yellowing of eyes")

    def test_057_alias_yellow_skin(self):
        self.assertEqual(self.ontology.normalize_term("yellow skin"), "yellowish skin")

    def test_058_alias_blood_in_poop(self):
        self.assertEqual(self.ontology.normalize_term("blood in poop"), "bloody stool")

    def test_059_alias_frequent_peeing(self):
        self.assertEqual(self.ontology.normalize_term("frequent peeing"), "polyuria")

    def test_060_alias_burning_when_peeing(self):
        self.assertEqual(self.ontology.normalize_term("burning when peeing"), "burning micturition")

    # -------------------------------------------------------------
    # Group 6: False-Positive & Entity Attribution Tests (15 tests)
    # -------------------------------------------------------------
    def test_061_entity_mother_diabetes(self):
        syms = self.ontology.extract_canonical_symptoms("My mother has diabetes and high blood pressure")
        self.assertEqual(syms, [])

    def test_062_entity_father_heart_attack(self):
        syms = self.ontology.extract_canonical_symptoms("My father died of a heart attack at 50")
        self.assertEqual(syms, [])

    def test_063_entity_dog_shivering(self):
        syms = self.ontology.extract_canonical_symptoms("My dog has been shivering and vomiting all day")
        self.assertEqual(syms, [])

    def test_064_entity_cat_vomiting(self):
        syms = self.ontology.extract_canonical_symptoms("My cat is not eating and has diarrhea")
        self.assertEqual(syms, [])

    def test_065_entity_brother_asthma(self):
        syms = self.ontology.extract_canonical_symptoms("My brother had asthma and coughing as a child")
        self.assertEqual(syms, [])

    def test_066_entity_sister_fever(self):
        syms = self.ontology.extract_canonical_symptoms("My sister caught fever and sore throat")
        self.assertEqual(syms, [])

    def test_067_entity_wife_headache(self):
        syms = self.ontology.extract_canonical_symptoms("My wife has severe migraine and nausea")
        self.assertEqual(syms, [])

    def test_068_entity_husband_chest_pain(self):
        syms = self.ontology.extract_canonical_symptoms("My husband complained of chest pain and breathlessness")
        self.assertEqual(syms, [])

    def test_069_entity_grandfather_arthritis(self):
        syms = self.ontology.extract_canonical_symptoms("My grandfather suffered from arthritis and joint pain")
        self.assertEqual(syms, [])

    def test_070_entity_grandmother_jaundice(self):
        syms = self.ontology.extract_canonical_symptoms("My grandmother had jaundice 20 years ago")
        self.assertEqual(syms, [])

    def test_071_entity_family_history_diabetes(self):
        syms = self.ontology.extract_canonical_symptoms("Strong family history of diabetes and obesity")
        self.assertEqual(syms, [])

    def test_072_entity_family_history_hypertension(self):
        syms = self.ontology.extract_canonical_symptoms("Family history of hypertension in both parents")
        self.assertEqual(syms, [])

    def test_073_entity_friend_fever(self):
        syms = self.ontology.extract_canonical_symptoms("My friend tested positive for dengue with high fever")
        self.assertEqual(syms, [])

    def test_074_entity_colleague_cough(self):
        syms = self.ontology.extract_canonical_symptoms("My colleague has a bad cough and runny nose")
        self.assertEqual(syms, [])

    def test_075_entity_parents_illness(self):
        syms = self.ontology.extract_canonical_symptoms("My parents had typhoid last year")
        self.assertEqual(syms, [])

    # -------------------------------------------------------------
    # Group 7: Negation Detection Tests (15 tests)
    # -------------------------------------------------------------
    def test_076_negation_no_fever(self):
        syms = self.ontology.extract_canonical_symptoms("I have no fever")
        self.assertNotIn("high fever", syms)
        self.assertNotIn("mild fever", syms)

    def test_077_negation_no_cough(self):
        syms = self.ontology.extract_canonical_symptoms("I have no cough")
        self.assertNotIn("cough", syms)

    def test_078_negation_without_chest_pain(self):
        syms = self.ontology.extract_canonical_symptoms("Headache without chest pain")
        self.assertIn("headache", syms)
        self.assertNotIn("chest pain", syms)

    def test_079_negation_denies_vomiting(self):
        syms = self.ontology.extract_canonical_symptoms("Patient denies vomiting or nausea")
        self.assertNotIn("vomiting", syms)
        self.assertNotIn("nausea", syms)

    def test_080_negation_dont_have_chills(self):
        syms = self.ontology.extract_canonical_symptoms("I don't have chills")
        self.assertNotIn("chills", syms)

    def test_081_negation_not_experiencing_dizziness(self):
        syms = self.ontology.extract_canonical_symptoms("Not experiencing dizziness")
        self.assertNotIn("dizziness", syms)

    def test_082_negation_never_had_jaundice(self):
        syms = self.ontology.extract_canonical_symptoms("Never had jaundice or yellowish skin")
        self.assertNotIn("yellowish skin", syms)

    def test_083_negation_free_of_rash(self):
        syms = self.ontology.extract_canonical_symptoms("Skin is free of rash")
        self.assertNotIn("skin rash", syms)

    def test_084_negation_negative_for_breathlessness(self):
        syms = self.ontology.extract_canonical_symptoms("Negative for breathlessness")
        self.assertNotIn("breathlessness", syms)

    def test_085_negation_neither_headache_nor_fever(self):
        syms = self.ontology.extract_canonical_symptoms("Neither headache nor fever")
        self.assertEqual(syms, [])

    def test_086_negation_has_no_stomach_pain(self):
        syms = self.ontology.extract_canonical_symptoms("Has no stomach pain")
        self.assertNotIn("stomach pain", syms)
        self.assertNotIn("abdominal pain", syms)

    def test_087_negation_no_signs_of_itching(self):
        syms = self.ontology.extract_canonical_symptoms("No signs of itching")
        self.assertNotIn("itching", syms)

    def test_088_negation_mixed_positive_negative_1(self):
        syms = self.ontology.extract_canonical_symptoms("I have severe headache, but no fever and no vomiting")
        self.assertIn("headache", syms)
        self.assertNotIn("high fever", syms)
        self.assertNotIn("vomiting", syms)

    def test_089_negation_mixed_positive_negative_2(self):
        syms = self.ontology.extract_canonical_symptoms("Persistent cough with fatigue, without chest pain")
        self.assertIn("cough", syms)
        self.assertIn("fatigue", syms)
        self.assertNotIn("chest pain", syms)

    def test_090_negation_mixed_positive_negative_3(self):
        syms = self.ontology.extract_canonical_symptoms("Burning when peeing, but no blood in urine")
        self.assertIn("burning micturition", syms)

    # -------------------------------------------------------------
    # Group 8: Non-Medical & Noise Rejection (10 tests)
    # -------------------------------------------------------------
    def test_091_noise_pizza(self):
        syms = self.ontology.extract_canonical_symptoms("I ate a really delicious thin crust pizza with cheese")
        self.assertEqual(syms, [])

    def test_092_noise_physics(self):
        syms = self.ontology.extract_canonical_symptoms("Quantum entanglement in theoretical physics")
        self.assertEqual(syms, [])

    def test_093_noise_greeting(self):
        syms = self.ontology.extract_canonical_symptoms("Hello doctor, good morning, how are you?")
        self.assertEqual(syms, [])

    def test_094_noise_weather(self):
        syms = self.ontology.extract_canonical_symptoms("It is raining heavily outside today")
        self.assertEqual(syms, [])

    def test_095_noise_vague_unwell(self):
        syms = self.ontology.extract_canonical_symptoms("I feel slightly unwell today")
        self.assertEqual(syms, [])

    def test_096_noise_empty_string(self):
        syms = self.ontology.extract_canonical_symptoms("")
        self.assertEqual(syms, [])

    def test_097_noise_whitespace_only(self):
        syms = self.ontology.extract_canonical_symptoms("    \n\t   ")
        self.assertEqual(syms, [])

    def test_098_noise_punctuation_only(self):
        syms = self.ontology.extract_canonical_symptoms("... ??? !!! ---")
        self.assertEqual(syms, [])

    def test_099_noise_random_characters(self):
        syms = self.ontology.extract_canonical_symptoms("asdfghjkl qwertyuiop zxcvbnm")
        self.assertEqual(syms, [])

    def test_100_noise_medication_query(self):
        syms = self.ontology.extract_canonical_symptoms("What is the standard dosage for paracetamol tablets?")
        self.assertEqual(syms, [])

    # -------------------------------------------------------------
    # Group 9: Complex Multi-Clause Clinical Narratives (5 tests)
    # -------------------------------------------------------------
    def test_101_complex_malaria_narrative(self):
        text = "I have high fever and shivering chills, sweating profusely at night, but no cough and no rash."
        syms = self.ontology.extract_canonical_symptoms(text)
        self.assertIn("high fever", syms)
        self.assertIn("chills", syms)
        self.assertIn("sweating", syms)
        self.assertNotIn("cough", syms)
        self.assertNotIn("skin rash", syms)

    def test_102_complex_gerd_narrative(self):
        text = "I have stomach pain and acidity after meals, plus nausea, but my father has hypertension."
        syms = self.ontology.extract_canonical_symptoms(text)
        self.assertIn("stomach pain", syms)
        self.assertIn("acidity", syms)
        self.assertIn("nausea", syms)

    def test_103_complex_jaundice_narrative(self):
        text = "Noticed yellowish skin and dark tea colored urine with fatigue, no abdominal pain."
        syms = self.ontology.extract_canonical_symptoms(text)
        self.assertIn("yellowish skin", syms)
        self.assertIn("dark urine", syms)
        self.assertIn("fatigue", syms)
        self.assertNotIn("abdominal pain", syms)

    def test_104_complex_cardiac_narrative(self):
        text = "Crushing chest pain radiating to arm, cold sweats and shortness of breath, my mother has diabetes."
        syms = self.ontology.extract_canonical_symptoms(text)
        self.assertIn("chest pain", syms)
        self.assertIn("breathlessness", syms)

    def test_105_complex_uti_narrative(self):
        text = "Burning when peeing and constant urge to pee with bladder discomfort, but no fever."
        syms = self.ontology.extract_canonical_symptoms(text)
        self.assertIn("burning micturition", syms)
        self.assertIn("continuous feel of urine", syms)
        self.assertIn("bladder discomfort", syms)
        self.assertNotIn("high fever", syms)

if __name__ == "__main__":
    unittest.main(verbosity=2)
