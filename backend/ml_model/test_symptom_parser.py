"""
MediSync360 Comprehensive Clinical Symptom Parser Test Suite (Assignment 6)
Over 200 Rigorous Unit Tests measuring precision, recall, negation, attribution, and attribute extraction.
"""

import unittest
import os
import sys

sys.path.append(os.path.dirname(__file__))
from symptom_parser import ClinicalSymptomParser

class TestClinicalSymptomParser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.parser = ClinicalSymptomParser.get_instance()

    # =========================================================================
    # Group 1: Canonical Symptom Precision & Recall (30 tests)
    # =========================================================================
    def test_001_headache_present(self):
        res = self.parser.parse("I have a headache.")
        self.assertIn("headache", res["present_symptoms"])

    def test_002_chest_pain_present(self):
        res = self.parser.parse("Experiencing chest pain since morning.")
        self.assertIn("chest pain", res["present_symptoms"])

    def test_003_high_fever_present(self):
        res = self.parser.parse("I am running a high fever.")
        self.assertIn("high fever", res["present_symptoms"])

    def test_004_cough_present(self):
        res = self.parser.parse("Persistent cough all day.")
        self.assertIn("cough", res["present_symptoms"])

    def test_005_nausea_vomiting_present(self):
        res = self.parser.parse("I have nausea and vomiting.")
        self.assertIn("nausea", res["present_symptoms"])
        self.assertIn("vomiting", res["present_symptoms"])

    def test_006_fatigue_present(self):
        res = self.parser.parse("Feeling extreme fatigue.")
        self.assertIn("fatigue", res["present_symptoms"])

    def test_007_joint_pain_present(self):
        res = self.parser.parse("Aching joint pain in knees.")
        self.assertIn("joint pain", res["present_symptoms"])

    def test_008_skin_rash_present(self):
        res = self.parser.parse("Red skin rash on my arms.")
        self.assertIn("skin rash", res["present_symptoms"])

    def test_009_dizziness_present(self):
        res = self.parser.parse("Feeling constant dizziness.")
        self.assertIn("dizziness", res["present_symptoms"])

    def test_010_itching_present(self):
        res = self.parser.parse("Unbearable itching on skin.")
        self.assertIn("itching", res["present_symptoms"])

    def test_011_chills_present(self):
        res = self.parser.parse("Shivering with intense chills.")
        self.assertIn("chills", res["present_symptoms"])

    def test_012_sweating_present(self):
        res = self.parser.parse("Waking up sweating heavily.")
        self.assertIn("sweating", res["present_symptoms"])

    def test_013_breathlessness_present(self):
        res = self.parser.parse("Shortness of breath when walking.")
        self.assertIn("breathlessness", res["present_symptoms"])

    def test_014_diarrhoea_present(self):
        res = self.parser.parse("Suffering from loose motions and diarrhoea.")
        self.assertIn("diarrhoea", res["present_symptoms"])

    def test_015_acidity_present(self):
        res = self.parser.parse("Severe acid reflux and acidity.")
        self.assertIn("acidity", res["present_symptoms"])

    def test_016_abdominal_pain_present(self):
        res = self.parser.parse("Severe stomach pain and abdominal ache.")
        self.assertIn("abdominal pain", res["present_symptoms"])

    def test_017_dark_urine_present(self):
        res = self.parser.parse("Noticed dark tea colored urine.")
        self.assertIn("dark urine", res["present_symptoms"])

    def test_018_yellowish_skin_present(self):
        res = self.parser.parse("My skin has turned yellow.")
        self.assertIn("yellowish skin", res["present_symptoms"])

    def test_019_yellowing_of_eyes_present(self):
        res = self.parser.parse("Yellow eyes with scleral icterus.")
        self.assertIn("yellowing of eyes", res["present_symptoms"])

    def test_020_burning_micturition_present(self):
        res = self.parser.parse("Burning sensation when peeing.")
        self.assertIn("burning micturition", res["present_symptoms"])

    def test_021_polyuria_present(self):
        res = self.parser.parse("Frequent peeing and urinating a lot.")
        self.assertIn("polyuria", res["present_symptoms"])

    def test_022_weight_loss_present(self):
        res = self.parser.parse("Unexplained rapid weight loss.")
        self.assertIn("weight loss", res["present_symptoms"])

    def test_023_excessive_hunger_present(self):
        res = self.parser.parse("Constant excessive hunger.")
        self.assertIn("excessive hunger", res["present_symptoms"])

    def test_024_fast_heart_rate_present(self):
        res = self.parser.parse("My heart is racing fast.")
        self.assertIn("fast heart rate", res["present_symptoms"])

    def test_025_loss_of_balance_present(self):
        res = self.parser.parse("Loss of balance and unsteadiness.")
        self.assertIn("loss of balance", res["present_symptoms"])
        self.assertIn("unsteadiness", res["present_symptoms"])

    def test_026_spinning_movements_present(self):
        res = self.parser.parse("The room is spinning around me.")
        self.assertIn("spinning movements", res["present_symptoms"])

    def test_027_swelled_lymph_nodes_present(self):
        res = self.parser.parse("Swollen lymph nodes in my neck.")
        self.assertIn("swelled lymph nodes", res["present_symptoms"])

    def test_028_throat_irritation_present(self):
        res = self.parser.parse("Scratchy sore throat and throat irritation.")
        self.assertIn("throat irritation", res["present_symptoms"])

    def test_029_phlegm_present(self):
        res = self.parser.parse("Coughing up thick green phlegm.")
        self.assertIn("phlegm", res["present_symptoms"])

    def test_030_back_pain_present(self):
        res = self.parser.parse("Lower back pain and backache.")
        self.assertIn("back pain", res["present_symptoms"])

    # =========================================================================
    # Group 2: Negation Detection & Absent Symptom Status (30 tests)
    # =========================================================================
    def test_031_negation_no_fever(self):
        res = self.parser.parse("I have a headache, but no fever.")
        self.assertIn("headache", res["present_symptoms"])
        self.assertIn("high fever", res["absent_symptoms"])
        self.assertNotIn("high fever", res["present_symptoms"])

    def test_032_negation_without_chest_pain(self):
        res = self.parser.parse("Breathlessness without chest pain.")
        self.assertIn("breathlessness", res["present_symptoms"])
        self.assertIn("chest pain", res["absent_symptoms"])
        self.assertNotIn("chest pain", res["present_symptoms"])

    def test_033_negation_denies_vomiting(self):
        res = self.parser.parse("Patient denies vomiting or nausea.")
        self.assertIn("vomiting", res["absent_symptoms"])
        self.assertIn("nausea", res["absent_symptoms"])
        self.assertNotIn("vomiting", res["present_symptoms"])

    def test_034_negation_dont_have_chills(self):
        res = self.parser.parse("I don't have chills.")
        self.assertIn("chills", res["absent_symptoms"])
        self.assertEqual(res["present_symptoms"], [])

    def test_035_negation_never_had_jaundice(self):
        res = self.parser.parse("Never had jaundice or yellowish skin.")
        self.assertIn("yellowish skin", res["absent_symptoms"])

    def test_036_negation_free_of_rash(self):
        res = self.parser.parse("Skin is free of rash.")
        self.assertIn("skin rash", res["absent_symptoms"])

    def test_037_negation_negative_for_cough(self):
        res = self.parser.parse("Negative for cough.")
        self.assertIn("cough", res["absent_symptoms"])

    def test_038_negation_neither_dizziness_nor_headache(self):
        res = self.parser.parse("Neither dizziness nor headache.")
        self.assertIn("dizziness", res["absent_symptoms"])
        self.assertIn("headache", res["absent_symptoms"])

    def test_039_negation_no_signs_of_itching(self):
        res = self.parser.parse("No signs of itching on my skin.")
        self.assertIn("itching", res["absent_symptoms"])

    def test_040_negation_has_no_stomach_pain(self):
        res = self.parser.parse("Has no stomach pain.")
        self.assertIn("stomach pain", res["absent_symptoms"])

    def test_041_negation_absent_breathlessness(self):
        res = self.parser.parse("Breathlessness is absent.")
        self.assertIn("breathlessness", res["absent_symptoms"])

    def test_042_negation_not_experiencing_sweating(self):
        res = self.parser.parse("Not experiencing sweating.")
        self.assertIn("sweating", res["absent_symptoms"])

    def test_043_negation_zero_fatigue(self):
        res = self.parser.parse("Zero fatigue today.")
        self.assertIn("fatigue", res["absent_symptoms"])

    def test_044_negation_no_blood_in_stool(self):
        res = self.parser.parse("Stomach ache, but no blood in stool.")
        self.assertIn("bloody stool", res["absent_symptoms"])

    def test_045_negation_did_not_have_nausea(self):
        res = self.parser.parse("I did not have nausea.")
        self.assertIn("nausea", res["absent_symptoms"])

    def test_046_negation_rule_out_fever(self):
        res = self.parser.parse("Rule out high fever.")
        self.assertIn("high fever", res["absent_symptoms"])

    def test_047_negation_no_joint_pain(self):
        res = self.parser.parse("Swelling without joint pain.")
        self.assertIn("joint pain", res["absent_symptoms"])

    def test_048_negation_not_dizzy(self):
        res = self.parser.parse("I am not dizzy.")
        self.assertIn("dizziness", res["absent_symptoms"])

    def test_049_negation_no_dark_urine(self):
        res = self.parser.parse("Jaundice suspected but no dark urine.")
        self.assertIn("dark urine", res["absent_symptoms"])

    def test_050_negation_no_sneezing(self):
        res = self.parser.parse("Sore throat with no sneezing.")
        self.assertIn("continuous sneezing", res["absent_symptoms"])

    def test_051_negation_without_phlegm(self):
        res = self.parser.parse("Dry cough without phlegm.")
        self.assertIn("phlegm", res["absent_symptoms"])

    def test_052_negation_no_swollen_legs(self):
        res = self.parser.parse("No swollen legs.")
        self.assertIn("swollen legs", res["absent_symptoms"])

    def test_053_negation_denies_chest_pain(self):
        res = self.parser.parse("Patient denies chest pain.")
        self.assertIn("chest pain", res["absent_symptoms"])

    def test_054_negation_free_of_blisters(self):
        res = self.parser.parse("Skin is free of blisters.")
        self.assertIn("blister", res["absent_symptoms"])

    def test_055_negation_no_weight_loss(self):
        res = self.parser.parse("Increased appetite but no weight loss.")
        self.assertIn("weight loss", res["absent_symptoms"])

    def test_056_negation_not_shivering(self):
        res = self.parser.parse("Not shivering.")
        self.assertIn("shivering", res["absent_symptoms"])

    def test_057_negation_no_back_pain(self):
        res = self.parser.parse("No back pain reported.")
        self.assertIn("back pain", res["absent_symptoms"])

    def test_058_negation_no_burning_urination(self):
        res = self.parser.parse("No burning when peeing.")
        self.assertIn("burning micturition", res["absent_symptoms"])

    def test_059_negation_no_constipation(self):
        res = self.parser.parse("Diarrhea with no constipation.")
        self.assertIn("constipation", res["absent_symptoms"])

    def test_060_negation_without_unsteadiness(self):
        res = self.parser.parse("Headache without unsteadiness.")
        self.assertIn("unsteadiness", res["absent_symptoms"])

    # =========================================================================
    # Group 3: Historical Symptoms (Past medical history) (20 tests)
    # =========================================================================
    def test_061_historical_fever_last_month(self):
        res = self.parser.parse("I had fever last month.")
        self.assertIn("high fever", res["historical_symptoms"])
        self.assertNotIn("high fever", res["present_symptoms"])

    def test_062_historical_jaundice_years_ago(self):
        res = self.parser.parse("I had jaundice years ago.")
        self.assertIn("yellowish skin", res["historical_symptoms"])

    def test_063_historical_cough_weeks_ago(self):
        res = self.parser.parse("Had bad cough weeks ago, now resolved.")
        self.assertIn("cough", res["historical_symptoms"])

    def test_064_historical_chickenpox_in_childhood(self):
        res = self.parser.parse("Had chickenpox blisters in childhood.")
        self.assertIn("blister", res["historical_symptoms"])

    def test_065_historical_malaria_last_year(self):
        res = self.parser.parse("I had chills and shivering last year.")
        self.assertIn("chills", res["historical_symptoms"])

    def test_066_historical_rash_in_past(self):
        res = self.parser.parse("In the past I experienced skin rash.")
        self.assertIn("skin rash", res["historical_symptoms"])

    def test_067_historical_vomiting_resolved(self):
        res = self.parser.parse("Previously had vomiting and nausea.")
        self.assertIn("vomiting", res["historical_symptoms"])

    def test_068_historical_history_of_ulcers(self):
        res = self.parser.parse("History of tongue ulcers.")
        self.assertIn("ulcers on tongue", res["historical_symptoms"])

    def test_069_historical_used_to_have_migraines(self):
        res = self.parser.parse("Used to have severe headaches.")
        self.assertIn("headache", res["historical_symptoms"])

    def test_070_historical_knee_pain_months_ago(self):
        res = self.parser.parse("Suffered from knee pain months ago.")
        self.assertIn("knee pain", res["historical_symptoms"])

    def test_071_historical_mixed_active_and_past(self):
        res = self.parser.parse("I have severe chest pain now, though I had fever last month.")
        self.assertIn("chest pain", res["present_symptoms"])
        self.assertIn("high fever", res["historical_symptoms"])

    def test_072_historical_fatigue_resolved(self):
        res = self.parser.parse("Fatigue from weeks ago.")
        self.assertIn("fatigue", res["historical_symptoms"])

    def test_073_historical_dizziness_past(self):
        res = self.parser.parse("In the past had dizziness.")
        self.assertIn("dizziness", res["historical_symptoms"])

    def test_074_historical_sweating_last_year(self):
        res = self.parser.parse("Night sweats last year.")
        self.assertIn("sweating", res["historical_symptoms"])

    def test_075_historical_diarrhoea_weeks_ago(self):
        res = self.parser.parse("Diarrhoea weeks ago.")
        self.assertIn("diarrhoea", res["historical_symptoms"])

    def test_076_historical_itching_as_child(self):
        res = self.parser.parse("Severe itching as a child.")
        self.assertIn("itching", res["historical_symptoms"])

    def test_077_historical_stomach_pain_past(self):
        res = self.parser.parse("Stomach pain in the past.")
        self.assertIn("stomach pain", res["historical_symptoms"])

    def test_078_historical_joint_pain_resolved(self):
        res = self.parser.parse("Joint pain last year.")
        self.assertIn("joint pain", res["historical_symptoms"])

    def test_079_historical_shortness_of_breath_past(self):
        res = self.parser.parse("Shortness of breath in the past.")
        self.assertIn("breathlessness", res["historical_symptoms"])

    def test_080_historical_dark_urine_months_ago(self):
        res = self.parser.parse("Dark tea colored urine months ago.")
        self.assertIn("dark urine", res["historical_symptoms"])

    # =========================================================================
    # Group 4: Third-Party & Family History Attribution (25 tests)
    # =========================================================================
    def test_081_entity_mother_diabetes(self):
        res = self.parser.parse("My mother has diabetes.")
        self.assertEqual(res["present_symptoms"], [])

    def test_082_entity_father_heart_attack(self):
        res = self.parser.parse("My father suffered chest pain and heart attack.")
        self.assertEqual(res["present_symptoms"], [])

    def test_083_entity_dog_vomited(self):
        res = self.parser.parse("My dog has been vomiting and shivering.")
        self.assertEqual(res["present_symptoms"], [])

    def test_084_entity_cat_diarrhea(self):
        res = self.parser.parse("My cat has diarrhea.")
        self.assertEqual(res["present_symptoms"], [])

    def test_085_entity_brother_cough(self):
        res = self.parser.parse("My brother has a bad cough.")
        self.assertEqual(res["present_symptoms"], [])

    def test_086_entity_sister_fever(self):
        res = self.parser.parse("My sister caught high fever.")
        self.assertEqual(res["present_symptoms"], [])

    def test_087_entity_wife_headache(self):
        res = self.parser.parse("My wife has severe headache and nausea.")
        self.assertEqual(res["present_symptoms"], [])

    def test_088_entity_husband_breathless(self):
        res = self.parser.parse("My husband gets breathless.")
        self.assertEqual(res["present_symptoms"], [])

    def test_089_entity_grandfather_arthritis(self):
        res = self.parser.parse("My grandfather suffered from joint pain.")
        self.assertEqual(res["present_symptoms"], [])

    def test_090_entity_grandmother_jaundice(self):
        res = self.parser.parse("My grandmother had yellow skin.")
        self.assertEqual(res["present_symptoms"], [])

    def test_091_entity_family_history_runs_in_family(self):
        res = self.parser.parse("Obesity runs in family.")
        self.assertEqual(res["present_symptoms"], [])

    def test_092_entity_friend_dengue(self):
        res = self.parser.parse("My friend has high fever and rash.")
        self.assertEqual(res["present_symptoms"], [])

    def test_093_entity_colleague_sick(self):
        res = self.parser.parse("My colleague has runny nose.")
        self.assertEqual(res["present_symptoms"], [])

    def test_094_entity_roommate_flu(self):
        res = self.parser.parse("My roommate has chills.")
        self.assertEqual(res["present_symptoms"], [])

    def test_095_entity_contrast_mother_and_patient(self):
        res = self.parser.parse("My mother has diabetes, but I have crushing chest pain.")
        self.assertIn("chest pain", res["present_symptoms"])

    def test_096_entity_contrast_father_and_patient(self):
        res = self.parser.parse("My father has hypertension, however I feel dizzy.")
        self.assertIn("dizziness", res["present_symptoms"])

    def test_097_entity_parents_illness(self):
        res = self.parser.parse("My parents had typhoid.")
        self.assertEqual(res["present_symptoms"], [])

    def test_098_entity_aunt_goiter(self):
        res = self.parser.parse("My aunt had enlarged thyroid.")
        self.assertEqual(res["present_symptoms"], [])

    def test_099_entity_uncle_varicose(self):
        res = self.parser.parse("My uncle has varicose veins.")
        self.assertEqual(res["present_symptoms"], [])

    def test_100_entity_cousin_asthma(self):
        res = self.parser.parse("My cousin has breathlessness.")
        self.assertEqual(res["present_symptoms"], [])

    def test_101_entity_son_rash(self):
        res = self.parser.parse("My son developed skin rash.")
        self.assertEqual(res["present_symptoms"], [])

    def test_102_entity_daughter_vomit(self):
        res = self.parser.parse("My daughter is vomiting.")
        self.assertEqual(res["present_symptoms"], [])

    def test_103_entity_coworker_cold(self):
        res = self.parser.parse("My coworker has continuous sneezing.")
        self.assertEqual(res["present_symptoms"], [])

    def test_104_entity_someone_else(self):
        res = self.parser.parse("Someone else had dark urine.")
        self.assertEqual(res["present_symptoms"], [])

    def test_105_entity_puppy_shivering(self):
        res = self.parser.parse("My puppy is shivering.")
        self.assertEqual(res["present_symptoms"], [])

    # =========================================================================
    # Group 5: Duration & Temporal Attribute Extraction (25 tests)
    # =========================================================================
    def test_106_duration_3_days(self):
        res = self.parser.parse("I've had high fever for the past three days.")
        ev = res["evidence_list"][0]
        self.assertIn("three days", ev["duration"])

    def test_107_duration_24_hours(self):
        res = self.parser.parse("Stomach pain over the last 24 hours.")
        ev = res["evidence_list"][0]
        self.assertIn("24 hours", ev["duration"])

    def test_108_duration_since_yesterday(self):
        res = self.parser.parse("Vomiting since yesterday morning.")
        ev = res["evidence_list"][0]
        self.assertIn("yesterday morning", ev["duration"])

    def test_109_duration_1_week(self):
        res = self.parser.parse("I have had a cough for almost a week.")
        ev = res["evidence_list"][0]
        self.assertIn("week", ev["duration"])

    def test_110_duration_2_weeks(self):
        res = self.parser.parse("Fatigue for two weeks.")
        ev = res["evidence_list"][0]
        self.assertIn("two weeks", ev["duration"])

    def test_111_duration_since_last_night(self):
        res = self.parser.parse("Headache since last night.")
        ev = res["evidence_list"][0]
        self.assertIn("last night", ev["duration"])

    def test_112_duration_5_days(self):
        res = self.parser.parse("Running fever for five days.")
        ev = res["evidence_list"][0]
        self.assertIn("five days", ev["duration"])

    def test_113_duration_4_hours(self):
        res = self.parser.parse("Chest pain for four hours.")
        ev = res["evidence_list"][0]
        self.assertIn("four hours", ev["duration"])

    def test_114_duration_several_days(self):
        res = self.parser.parse("Joint pain for several days.")
        ev = res["evidence_list"][0]
        self.assertIn("several days", ev["duration"])

    def test_115_duration_a_few_days(self):
        res = self.parser.parse("Skin rash for a few days.")
        ev = res["evidence_list"][0]
        self.assertIn("a few days", ev["duration"])

    def test_116_duration_unknown(self):
        res = self.parser.parse("I have a headache.")
        ev = res["evidence_list"][0]
        self.assertEqual(ev["duration"], "UNKNOWN")

    def test_117_duration_this_morning(self):
        res = self.parser.parse("Dizziness since this morning.")
        ev = res["evidence_list"][0]
        self.assertIn("this morning", ev["duration"])

    def test_118_duration_2_days(self):
        res = self.parser.parse("Diarrhoea for two days.")
        ev = res["evidence_list"][0]
        self.assertIn("two days", ev["duration"])

    def test_119_duration_3_weeks(self):
        res = self.parser.parse("Weight loss over three weeks.")
        ev = res["evidence_list"][0]
        self.assertIn("three weeks", ev["duration"])

    def test_120_duration_1_month(self):
        res = self.parser.parse("Back pain for one month.")
        ev = res["evidence_list"][0]
        self.assertIn("one month", ev["duration"])

    def test_121_duration_6_days(self):
        res = self.parser.parse("Chills for six days.")
        ev = res["evidence_list"][0]
        self.assertIn("six days", ev["duration"])

    def test_122_duration_8_hours(self):
        res = self.parser.parse("Nausea for eight hours.")
        ev = res["evidence_list"][0]
        self.assertIn("eight hours", ev["duration"])

    def test_123_duration_7_days(self):
        res = self.parser.parse("Sweating for seven days.")
        ev = res["evidence_list"][0]
        self.assertIn("seven days", ev["duration"])

    def test_124_duration_10_days(self):
        res = self.parser.parse("Itching for ten days.")
        ev = res["evidence_list"][0]
        self.assertIn("ten days", ev["duration"])

    def test_125_duration_sentence_inheritance(self):
        res = self.parser.parse("For the past three days I have had a headache. It also causes nausea.")
        self.assertEqual(len(res["evidence_list"]), 2)
        self.assertIn("three days", res["evidence_list"][0]["duration"])

    def test_126_duration_4_days(self):
        res = self.parser.parse("Acidity for four days.")
        self.assertIn("four days", res["evidence_list"][0]["duration"])

    def test_127_duration_2_months(self):
        res = self.parser.parse("Joint pain for two months.")
        self.assertIn("two months", res["evidence_list"][0]["duration"])

    def test_128_duration_9_days(self):
        res = self.parser.parse("Runny nose for nine days.")
        self.assertIn("nine days", res["evidence_list"][0]["duration"])

    def test_129_duration_3_hours(self):
        res = self.parser.parse("Palpitations for three hours.")
        self.assertIn("three hours", res["evidence_list"][0]["duration"])

    def test_130_duration_1_year(self):
        res = self.parser.parse("Knee stiffness for one year.")
        self.assertIn("one year", res["evidence_list"][0]["duration"])

    # =========================================================================
    # Group 6: Severity Extraction (20 tests)
    # =========================================================================
    def test_131_severity_severe_headache(self):
        res = self.parser.parse("Severe headache.")
        self.assertEqual(res["evidence_list"][0]["severity"], "severe")

    def test_132_severity_mild_fever(self):
        res = self.parser.parse("I have a mild fever.")
        self.assertEqual(res["evidence_list"][0]["severity"], "mild")

    def test_133_severity_excruciating_pain(self):
        res = self.parser.parse("Excruciating stomach pain.")
        self.assertEqual(res["evidence_list"][0]["severity"], "severe")

    def test_134_severity_unbearable_itching(self):
        res = self.parser.parse("Unbearable itching on my skin.")
        self.assertEqual(res["evidence_list"][0]["severity"], "severe")

    def test_135_severity_terrible_cough(self):
        res = self.parser.parse("Terrible cough all night.")
        self.assertEqual(res["evidence_list"][0]["severity"], "severe")

    def test_136_severity_slight_dizziness(self):
        res = self.parser.parse("Slight dizziness when standing.")
        self.assertEqual(res["evidence_list"][0]["severity"], "mild")

    def test_137_severity_moderate_fatigue(self):
        res = self.parser.parse("Moderate fatigue during the day.")
        self.assertEqual(res["evidence_list"][0]["severity"], "moderate")

    def test_138_severity_intense_chills(self):
        res = self.parser.parse("Intense chills and shivering.")
        self.assertEqual(res["evidence_list"][0]["severity"], "severe")

    def test_139_severity_really_bad_nausea(self):
        res = self.parser.parse("Really bad nausea.")
        self.assertEqual(res["evidence_list"][0]["severity"], "severe")

    def test_140_severity_extreme_fatigue(self):
        res = self.parser.parse("Extremely tired and fatigued.")
        self.assertEqual(res["evidence_list"][0]["severity"], "severe")

    def test_141_severity_minor_rash(self):
        res = self.parser.parse("Minor skin rash.")
        self.assertEqual(res["evidence_list"][0]["severity"], "mild")

    def test_142_severity_quite_unwell_breathless(self):
        res = self.parser.parse("Quite breathless.")
        self.assertEqual(res["evidence_list"][0]["severity"], "moderate")

    def test_143_severity_heavy_sweating(self):
        res = self.parser.parse("Sweating heavily.")
        self.assertEqual(res["evidence_list"][0]["severity"], "severe")

    def test_144_severity_a_bit_dizzy(self):
        res = self.parser.parse("A bit dizzy.")
        self.assertEqual(res["evidence_list"][0]["severity"], "mild")

    def test_145_severity_fairly_bad_pain(self):
        res = self.parser.parse("Fairly bad joint pain.")
        self.assertEqual(res["evidence_list"][0]["severity"], "moderate")

    def test_146_severity_unknown_when_unspecified(self):
        res = self.parser.parse("I have cough.")
        self.assertEqual(res["evidence_list"][0]["severity"], "UNKNOWN")

    def test_147_severity_severely_constipated(self):
        res = self.parser.parse("Severely constipated.")
        self.assertEqual(res["evidence_list"][0]["severity"], "severe")

    def test_148_severity_slight_acidity(self):
        res = self.parser.parse("Slight acidity.")
        self.assertEqual(res["evidence_list"][0]["severity"], "mild")

    def test_149_severity_intense_itching(self):
        res = self.parser.parse("Intense itching.")
        self.assertEqual(res["evidence_list"][0]["severity"], "severe")

    def test_150_severity_little_fever(self):
        res = self.parser.parse("A little fever.")
        self.assertEqual(res["evidence_list"][0]["severity"], "mild")

    # =========================================================================
    # Group 7: Trigger & Location Extraction (20 tests)
    # =========================================================================
    def test_151_trigger_climbing_stairs(self):
        res = self.parser.parse("Breathlessness when climbing stairs.")
        self.assertEqual(res["evidence_list"][0]["trigger"], "exertion / physical activity")

    def test_152_trigger_after_eating(self):
        res = self.parser.parse("Stomach pain after eating.")
        self.assertEqual(res["evidence_list"][0]["trigger"], "after eating / meals")

    def test_153_trigger_walking(self):
        res = self.parser.parse("Knee pain when walking.")
        self.assertEqual(res["evidence_list"][0]["trigger"], "exertion / physical activity")

    def test_154_trigger_after_meals(self):
        res = self.parser.parse("Acidity after meals.")
        self.assertEqual(res["evidence_list"][0]["trigger"], "after eating / meals")

    def test_155_trigger_lying_down(self):
        res = self.parser.parse("Acid reflux when lying down.")
        self.assertEqual(res["evidence_list"][0]["trigger"], "bending over")

    def test_156_trigger_cold_air(self):
        res = self.parser.parse("Coughing in the cold air.")
        self.assertEqual(res["evidence_list"][0]["trigger"], "cold exposure")

    def test_157_trigger_work_stress(self):
        res = self.parser.parse("Headache due to work stress.")
        self.assertEqual(res["evidence_list"][0]["trigger"], "stress")

    def test_158_trigger_fatty_food(self):
        res = self.parser.parse("Nausea after eating fatty food.")
        self.assertEqual(res["evidence_list"][0]["trigger"], "after eating / meals")

    def test_159_trigger_unknown_when_unspecified(self):
        res = self.parser.parse("I have cough.")
        self.assertEqual(res["evidence_list"][0]["trigger"], "UNKNOWN")

    def test_160_trigger_exercise(self):
        res = self.parser.parse("Chest discomfort during exercise.")
        self.assertEqual(res["evidence_list"][0]["trigger"], "exertion / physical activity")

    def test_161_location_chest(self):
        res = self.parser.parse("Severe pain in my chest.")
        self.assertEqual(res["evidence_list"][0]["location"], "chest")

    def test_162_location_left_arm(self):
        res = self.parser.parse("Chest pain radiating to left arm.")
        self.assertEqual(res["evidence_list"][0]["location"], "left arm")

    def test_163_location_stomach(self):
        res = self.parser.parse("Aching in my stomach.")
        self.assertEqual(res["evidence_list"][0]["location"], "abdomen / stomach")

    def test_164_location_lower_back(self):
        res = self.parser.parse("Pain in my lower back.")
        self.assertEqual(res["evidence_list"][0]["location"], "lower back")

    def test_165_location_neck(self):
        res = self.parser.parse("Stiffness in neck.")
        self.assertEqual(res["evidence_list"][0]["location"], "neck")

    def test_166_location_knees(self):
        res = self.parser.parse("Swelling in both knees.")
        self.assertEqual(res["evidence_list"][0]["location"], "knees / legs")

    def test_167_location_head(self):
        res = self.parser.parse("Throbbing in my temples and head.")
        self.assertEqual(res["evidence_list"][0]["location"], "head / temples")

    def test_168_location_lower_abdomen(self):
        res = self.parser.parse("Discomfort in lower abdomen.")
        self.assertEqual(res["evidence_list"][0]["location"], "lower abdomen")

    def test_169_location_joints(self):
        res = self.parser.parse("Inflammation in joints.")
        self.assertEqual(res["evidence_list"][0]["location"], "joints")

    def test_170_location_unknown(self):
        res = self.parser.parse("I feel chills.")
        self.assertEqual(res["evidence_list"][0]["location"], "UNKNOWN")

    # =========================================================================
    # Group 8: Frequency & Temporal Pattern Extraction (15 tests)
    # =========================================================================
    def test_171_frequency_constant(self):
        res = self.parser.parse("Constant headache.")
        self.assertEqual(res["evidence_list"][0]["frequency"], "constant")

    def test_172_frequency_intermittent(self):
        res = self.parser.parse("Intermittent dizziness that comes and goes.")
        self.assertEqual(res["evidence_list"][0]["frequency"], "intermittent")

    def test_173_frequency_sometimes(self):
        res = self.parser.parse("Sometimes my heart starts racing.")
        self.assertEqual(res["evidence_list"][0]["frequency"], "intermittent")

    def test_174_frequency_continuous(self):
        res = self.parser.parse("Continuous coughing.")
        self.assertEqual(res["evidence_list"][0]["frequency"], "constant")

    def test_175_frequency_frequent(self):
        res = self.parser.parse("Frequent urination.")
        self.assertEqual(res["evidence_list"][0]["frequency"], "frequent")

    def test_176_frequency_occasional(self):
        res = self.parser.parse("Occasional vomiting.")
        self.assertEqual(res["evidence_list"][0]["frequency"], "intermittent")

    def test_177_frequency_persistent(self):
        res = self.parser.parse("Persistent itching.")
        self.assertEqual(res["evidence_list"][0]["frequency"], "constant")

    def test_178_frequency_unknown(self):
        res = self.parser.parse("I have nausea.")
        self.assertEqual(res["evidence_list"][0]["frequency"], "UNKNOWN")

    def test_179_temporal_nocturnal_sweats(self):
        res = self.parser.parse("Sweating heavily at night.")
        self.assertEqual(res["evidence_list"][0]["temporal_pattern"], "nocturnal / at night")

    def test_180_temporal_morning_stiffness(self):
        res = self.parser.parse("Joint pain in the morning.")
        self.assertEqual(res["evidence_list"][0]["temporal_pattern"], "morning")

    def test_181_temporal_worsening(self):
        res = self.parser.parse("Cough is getting worse.")
        self.assertEqual(res["evidence_list"][0]["temporal_pattern"], "worsening")

    def test_182_temporal_night_cough(self):
        res = self.parser.parse("Cough wakes me up at night.")
        self.assertEqual(res["evidence_list"][0]["temporal_pattern"], "nocturnal / at night")

    def test_183_temporal_upon_waking(self):
        res = self.parser.parse("Nausea upon waking.")
        self.assertEqual(res["evidence_list"][0]["temporal_pattern"], "morning")

    def test_184_temporal_unknown(self):
        res = self.parser.parse("I have fever.")
        self.assertEqual(res["evidence_list"][0]["temporal_pattern"], "UNKNOWN")

    def test_185_temporal_progressively_worse(self):
        res = self.parser.parse("Progressively worse breathlessness.")
        self.assertEqual(res["evidence_list"][0]["temporal_pattern"], "worsening")

    # =========================================================================
    # Group 9: Hypothetical Questions & Speculative Statements (15 tests)
    # =========================================================================
    def test_186_question_migraine_headache(self):
        res = self.parser.parse("Could my headache be migraine?")
        self.assertIn("headache", res["present_symptoms"])

    def test_187_question_is_it_possible_malaria(self):
        res = self.parser.parse("Is it possible that my fever and chills are malaria?")
        self.assertIn("high fever", res["present_symptoms"])
        self.assertIn("chills", res["present_symptoms"])

    def test_188_speculative_might_be_dengue(self):
        res = self.parser.parse("Maybe this rash is dengue?")
        self.assertIn("skin rash", res["present_symptoms"])

    def test_189_speculative_wondering_if_gerd(self):
        res = self.parser.parse("Wondering if my stomach pain is gerd?")
        self.assertIn("stomach pain", res["present_symptoms"])

    def test_190_question_could_this_be_diabetes(self):
        res = self.parser.parse("Could this frequent peeing be diabetes?")
        self.assertIn("polyuria", res["present_symptoms"])

    def test_191_speculative_suspect_jaundice(self):
        res = self.parser.parse("I suspect this yellow skin is jaundice.")
        self.assertIn("yellowish skin", res["present_symptoms"])

    def test_192_question_what_if_asthma(self):
        res = self.parser.parse("What if this cough is asthma?")
        self.assertIn("cough", res["present_symptoms"])

    def test_193_question_could_it_be_uti(self):
        res = self.parser.parse("Could it be a urinary tract infection with this burning urination?")
        self.assertIn("burning micturition", res["present_symptoms"])

    def test_194_question_maybe_arthritis(self):
        res = self.parser.parse("Maybe this joint pain is arthritis?")
        self.assertIn("joint pain", res["present_symptoms"])

    def test_195_question_wondering_if_pneumonia(self):
        res = self.parser.parse("Wondering if my breathlessness is pneumonia?")
        self.assertIn("breathlessness", res["present_symptoms"])

    def test_196_question_is_it_possible_psoriasis(self):
        res = self.parser.parse("Is it possible that this skin peeling is psoriasis?")
        self.assertIn("skin peeling", res["present_symptoms"])

    def test_197_question_could_this_be_typhoid(self):
        res = self.parser.parse("Could this belly pain be typhoid?")
        self.assertIn("belly pain", res["present_symptoms"])

    def test_198_question_maybe_cold(self):
        res = self.parser.parse("Maybe this runny nose is common cold?")
        self.assertIn("runny nose", res["present_symptoms"])

    def test_199_question_could_it_be_vertigo(self):
        res = self.parser.parse("Could it be vertigo with this room spinning?")
        self.assertIn("spinning movements", res["present_symptoms"])

    def test_200_question_wondering_if_acne(self):
        res = self.parser.parse("Wondering if these pimples are acne?")
        self.assertIn("pus filled pimples", res["present_symptoms"])

    # =========================================================================
    # Group 10: Complex Multi-Sentence Clinical Narratives (10 tests)
    # =========================================================================
    def test_201_complex_triad_narrative(self):
        text = "For the past three days I've been extremely tired. I get breathless when climbing stairs and sometimes my heart starts racing."
        res = self.parser.parse(text)
        self.assertIn("fatigue", res["present_symptoms"])
        self.assertIn("breathlessness", res["present_symptoms"])
        self.assertIn("fast heart rate", res["present_symptoms"])

        # Check attributes
        fatigue_ev = next(e for e in res["evidence_list"] if e["canonical_symptom"] == "fatigue")
        self.assertEqual(fatigue_ev["severity"], "severe")
        self.assertIn("three days", fatigue_ev["duration"])

        breath_ev = next(e for e in res["evidence_list"] if e["canonical_symptom"] == "breathlessness")
        self.assertEqual(breath_ev["trigger"], "exertion / physical activity")

    def test_202_complex_gerd_narrative(self):
        text = "My stomach hurts after eating and I get a burning feeling in my chest. No vomiting though."
        res = self.parser.parse(text)
        self.assertIn("stomach pain", res["present_symptoms"])
        self.assertIn("acidity", res["present_symptoms"])
        self.assertIn("vomiting", res["absent_symptoms"])

    def test_203_complex_malaria_narrative(self):
        text = "Since yesterday morning I've had high fever. I keep getting intense chills and then wake up sweating heavily at night."
        res = self.parser.parse(text)
        self.assertIn("high fever", res["present_symptoms"])
        self.assertIn("chills", res["present_symptoms"])
        self.assertIn("sweating", res["present_symptoms"])

        sweat_ev = next(e for e in res["evidence_list"] if e["canonical_symptom"] == "sweating")
        self.assertEqual(sweat_ev["temporal_pattern"], "nocturnal / at night")

    def test_204_complex_jaundice_narrative(self):
        text = "I noticed yellowish skin and dark tea colored urine for the past week. Denies abdominal pain."
        res = self.parser.parse(text)
        self.assertIn("yellowish skin", res["present_symptoms"])
        self.assertIn("dark urine", res["present_symptoms"])
        self.assertIn("abdominal pain", res["absent_symptoms"])

    def test_205_complex_cardiac_emergency_narrative(self):
        text = "Severe crushing chest pain radiating to left arm since an hour ago. Breathless with cold sweat, my father died of heart attack."
        res = self.parser.parse(text)
        self.assertIn("chest pain", res["present_symptoms"])
        self.assertIn("breathlessness", res["present_symptoms"])
        self.assertIn("sweating", res["present_symptoms"])

    def test_206_complex_uti_narrative(self):
        text = "Burning when peeing and constant urge to pee over the last 24 hours. No fever."
        res = self.parser.parse(text)
        self.assertIn("burning micturition", res["present_symptoms"])
        self.assertIn("continuous feel of urine", res["present_symptoms"])
        self.assertIn("high fever", res["absent_symptoms"])

    def test_207_complex_cold_narrative(self):
        text = "Constant sneezing fits, stuffy nose, and slight sore throat for two days. No chest pain."
        res = self.parser.parse(text)
        self.assertIn("continuous sneezing", res["present_symptoms"])
        self.assertIn("congestion", res["present_symptoms"])
        self.assertIn("throat irritation", res["present_symptoms"])
        self.assertIn("chest pain", res["absent_symptoms"])

    def test_208_complex_dengue_narrative(self):
        text = "High fever for five days with excruciating pain behind eyes and joint pain. Vomited once."
        res = self.parser.parse(text)
        self.assertIn("high fever", res["present_symptoms"])
        self.assertIn("pain behind the eyes", res["present_symptoms"])
        self.assertIn("joint pain", res["present_symptoms"])
        self.assertIn("vomiting", res["present_symptoms"])

    def test_209_complex_asthma_narrative(self):
        text = "Dry cough and shortness of breath when exercising in the cold air. Had fever last year."
        res = self.parser.parse(text)
        self.assertIn("cough", res["present_symptoms"])
        self.assertIn("breathlessness", res["present_symptoms"])
        self.assertIn("high fever", res["historical_symptoms"])

    def test_210_complex_vertigo_narrative(self):
        text = "Sudden room spinning and unsteadiness when turning my head since this morning. Severe nausea."
        res = self.parser.parse(text)
        self.assertIn("spinning movements", res["present_symptoms"])
        self.assertIn("unsteadiness", res["present_symptoms"])
        self.assertIn("nausea", res["present_symptoms"])

if __name__ == "__main__":
    unittest.main(verbosity=2)
