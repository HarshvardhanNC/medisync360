"""
Zero-Dependency Standalone HTTP Server for MediSync360 Insurance AI.
Runs on Port 5001 without requiring Flask, pandas, or sklearn.
Handles CORS, /health, /predict-claim, /compare-claim, and /companies.
"""
import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from legacy_adapter import execute_claim_evaluation
from registry.product_registry import list_supported_policies
from rules import INSURANCE_RULES


class InsuranceAIHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = json.dumps({"status": "ok", "service": "MediSync360 Insurance AI v3 (Deterministic)", "port": 5001})
            self.wfile.write(resp.encode("utf-8"))
        elif self.path == "/companies":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            companies = []
            for p in list_supported_policies():
                companies.append({
                    "name": p.insurer_name,
                    "product": p.product_name,
                    "uin": p.uin,
                    "room_rent_category": p.room_entitlement.category.value,
                    "standard_copay_pct": p.standard_copay_pct,
                    "waiting_period_months": p.waiting_periods.pre_existing_disease_months,
                })
            self.wfile.write(json.dumps(companies).encode("utf-8"))
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_len).decode("utf-8")
        try:
            payload = json.loads(post_data) if post_data else {}
        except Exception:
            payload = {}

        if self.path == "/predict-claim":
            try:
                result = execute_claim_evaluation(payload)
                self.send_response(200)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

        elif self.path == "/compare-claim":
            try:
                results = []
                for p in list_supported_policies():
                    comp_payload = {**payload, "company": p.insurer_name}
                    try:
                        r = execute_claim_evaluation(comp_payload)
                        results.append({
                            "company": p.insurer_name,
                            "approved_amount": r["approved_amount"],
                            "total_deducted": round(r["total_claimed_amount"] - r["approved_amount"], 2),
                            "claim_efficiency_pct": r["claim_efficiency_pct"],
                            "approval_probability": r["approval_probability"],
                            "risk_score": r["risk_score"],
                            "risk_tier": r["risk_tier"],
                            "co_pay_pct": p.standard_copay_pct,
                            "hard_reject": r["status"] == "REJECTED",
                            "top_recommendation": r["recommendations"][0] if r["recommendations"] else "",
                        })
                    except Exception:
                        continue
                results.sort(key=lambda x: x["approved_amount"], reverse=True)
                self.send_response(200)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                resp = {"total_claimed": payload.get("sum_insured", 0), "comparison": results}
                self.wfile.write(json.dumps(resp).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[Insurance AI :5001] {self.address_string()} - {format % args}\n")


def run_server(host="0.0.0.0", port=5001):
    server = HTTPServer((host, port), InsuranceAIHandler)
    print(f"MediSync360 Insurance AI Server running on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Insurance AI Server...")
        server.server_close()


if __name__ == "__main__":
    run_server()

