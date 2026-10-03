"""
AddisFix backend end-to-end API tests.
Covers: auth, authorization, uploads, AI analyze, reports + incident engine,
duplicate detection, incidents list/detail, confirm/follow, authority workflow,
notifications, and admin endpoints.
"""
import io
import os
import time
import uuid
import pytest
import requests
from PIL import Image, ImageDraw

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://addisfix-demo.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "dagmawiaddisu94@gmail.com"
ADMIN_PASSWORD = "AddisFix@2026"
AUTHORITY_EMAIL = "demo.authority@addisfix.demo"
AUTHORITY_PASSWORD = "Demo@2026"


# ---------- helpers ----------
def _make_jpeg(seed=0) -> bytes:
    """Produce a non-blank JPEG with some content (roughly resembles a street scene)."""
    img = Image.new("RGB", (640, 480), color=(90, 90, 90))
    d = ImageDraw.Draw(img)
    # road
    d.rectangle([0, 300, 640, 480], fill=(60, 60, 60))
    # pothole-looking blob
    d.ellipse([260 + seed, 360, 420 + seed, 440], fill=(10, 10, 10))
    d.ellipse([280 + seed, 370, 400 + seed, 420], fill=(0, 0, 0))
    # sky and buildings
    d.rectangle([0, 0, 640, 300], fill=(140, 170, 200))
    d.rectangle([40, 150, 180, 300], fill=(130, 110, 90))
    d.rectangle([220, 120, 400, 300], fill=(160, 140, 120))
    d.rectangle([440, 170, 600, 300], fill=(120, 100, 80))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(session, email, password):
    r = session.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    return r.json()


def _register(email=None, name="Test Citizen"):
    s = _session()
    email = email or f"test_{uuid.uuid4().hex[:10]}@example.com"
    password = "Test@2026"
    r = s.post(f"{API}/auth/register", json={"name": name, "email": email, "password": password})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    return s, email, password, r.json()


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def admin_session():
    s = _session()
    _login(s, ADMIN_EMAIL, ADMIN_PASSWORD)
    return s


@pytest.fixture(scope="module")
def authority_session():
    s = _session()
    _login(s, AUTHORITY_EMAIL, AUTHORITY_PASSWORD)
    return s


@pytest.fixture(scope="module")
def citizen():
    """Fresh registered citizen (session + email)."""
    s, email, pw, user = _register()
    return {"session": s, "email": email, "password": pw, "user": user}


# ---------- health ----------
def test_health():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["ai_available"] is True


# ---------- auth ----------
class TestAuth:
    def test_register_citizen(self):
        s, email, pw, user = _register()
        assert user["email"] == email
        assert user["role"] == "citizen"
        assert "access_token" in s.cookies.get_dict()

    def test_register_duplicate(self, citizen):
        r = requests.post(f"{API}/auth/register",
                          json={"name": "Dup", "email": citizen["email"], "password": "x" * 8})
        assert r.status_code == 400

    def test_login_admin(self):
        s = _session()
        data = _login(s, ADMIN_EMAIL, ADMIN_PASSWORD)
        assert data["role"] == "admin"

    def test_me_with_cookie(self, citizen):
        r = citizen["session"].get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == citizen["email"]

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_login_bad_password(self):
        s = _session()
        r = s.post(f"{API}/auth/login",
                   json={"email": f"nouser_{uuid.uuid4().hex[:6]}@ex.com", "password": "bad"})
        assert r.status_code == 401

    def test_logout(self):
        s, email, pw, _ = _register()
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # me should now fail
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 401


# ---------- authorization ----------
class TestAuthorization:
    def test_create_report_unauthenticated_401(self):
        r = requests.post(f"{API}/reports", json={
            "title": "x", "description": "xxxxx",
            "category": "potholes", "severity": "high",
            "latitude": 9.01, "longitude": 38.76, "image_ids": []})
        assert r.status_code == 401

    def test_citizen_forbidden_list_reports(self, citizen):
        r = citizen["session"].get(f"{API}/reports")
        assert r.status_code == 403

    def test_citizen_forbidden_authority_stats(self, citizen):
        r = citizen["session"].get(f"{API}/authority/stats")
        assert r.status_code == 403

    def test_citizen_forbidden_admin_stats(self, citizen):
        r = citizen["session"].get(f"{API}/admin/stats")
        assert r.status_code == 403

    def test_citizen_forbidden_admin_users(self, citizen):
        r = citizen["session"].get(f"{API}/admin/users")
        assert r.status_code == 403


# ---------- uploads + AI ----------
class TestUploadsAndAI:
    def test_upload_jpeg(self, citizen):
        s = citizen["session"]
        files = {"file": ("pothole.jpg", _make_jpeg(), "image/jpeg")}
        # multipart - must not force json content-type
        r = requests.post(f"{API}/uploads", files=files, cookies=s.cookies)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body and body["content_type"] == "image/jpeg"
        citizen["file_id"] = body["id"]

    def test_serve_raw(self, citizen):
        fid = citizen["file_id"]
        r = requests.get(f"{API}/uploads/{fid}/raw")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")
        assert len(r.content) > 500

    def test_upload_rejects_bad_type(self, citizen):
        s = citizen["session"]
        files = {"file": ("bad.txt", b"hello world", "text/plain")}
        r = requests.post(f"{API}/uploads", files=files, cookies=s.cookies)
        assert r.status_code == 400

    def test_upload_unauthenticated_401(self):
        files = {"file": ("p.jpg", _make_jpeg(), "image/jpeg")}
        r = requests.post(f"{API}/uploads", files=files)
        assert r.status_code == 401

    def test_ai_analyze(self, citizen):
        fid = citizen["file_id"]
        r = citizen["session"].post(f"{API}/ai/analyze/{fid}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "available" in body
        if body["available"]:
            for k in ("category", "severity", "description", "confidence", "model"):
                assert k in body, f"missing {k} in AI response"
            assert isinstance(body["confidence"], (int, float))
        else:
            assert "message" in body


# ---------- reports + incident engine ----------
class TestReportsAndIncidents:
    def test_create_report_links_or_creates(self, citizen):
        s = citizen["session"]
        # upload first image
        files = {"file": ("p.jpg", _make_jpeg(seed=1), "image/jpeg")}
        up = requests.post(f"{API}/uploads", files=files, cookies=s.cookies).json()
        payload = {
            "title": "Pothole on Bole Road",
            "description": "Large pothole causing traffic hazard near intersection.",
            "category": "potholes", "severity": "high",
            "latitude": 9.0106, "longitude": 38.7613,
            "location_description": "Bole", "image_ids": [up["id"]],
        }
        r = s.post(f"{API}/reports", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["report_id"].startswith("rep_")
        assert body["incident_id"] and body["incident_id"].startswith("inc_")
        assert "match" in body and "linked" in body["match"]
        citizen["first_report"] = body
        citizen["first_incident_id"] = body["incident_id"]

    def test_second_nearby_report_links(self, citizen):
        s = citizen["session"]
        files = {"file": ("p.jpg", _make_jpeg(seed=2), "image/jpeg")}
        up = requests.post(f"{API}/uploads", files=files, cookies=s.cookies).json()
        # very near first (<75m)
        payload = {
            "title": "Same pothole different reporter",
            "description": "Nearby duplicate", "category": "potholes", "severity": "medium",
            "latitude": 9.01065, "longitude": 38.76135,
            "location_description": "Bole", "image_ids": [up["id"]],
        }
        r = s.post(f"{API}/reports", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body["match"]["linked"] is True
        assert body["incident_id"] == citizen["first_incident_id"]

    def test_far_report_creates_new_incident(self, citizen):
        s = citizen["session"]
        files = {"file": ("p.jpg", _make_jpeg(seed=3), "image/jpeg")}
        up = requests.post(f"{API}/uploads", files=files, cookies=s.cookies).json()
        # pick a random very-far coordinate so a prior test run cannot have left an
        # incident within 75m here (test data is persistent across runs).
        import random
        lat = round(random.uniform(-60.0, -20.0), 5)
        lng = round(random.uniform(-170.0, -120.0), 5)
        payload = {
            "title": "Different pothole far away",
            "description": "Different location (random far point)",
            "category": "potholes", "severity": "medium",
            "latitude": lat, "longitude": lng,
            "location_description": "Far", "image_ids": [up["id"]],
        }
        r = s.post(f"{API}/reports", json=payload)
        assert r.status_code == 200
        body = r.json()
        assert body["match"]["linked"] is False, f"unexpectedly linked: {body['match']}"
        assert body["incident_id"] != citizen["first_incident_id"]

    def test_my_reports(self, citizen):
        r = citizen["session"].get(f"{API}/reports/mine")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 3
        assert all(it["reporter_id"] == citizen["user"]["user_id"] for it in items)

    def test_other_citizen_cannot_view_report(self, citizen):
        # create another citizen and try to GET first citizen's report
        s2, email2, pw2, user2 = _register()
        rid = citizen["first_report"]["report_id"]
        r = s2.get(f"{API}/reports/{rid}")
        assert r.status_code == 403


# ---------- public incidents ----------
class TestIncidentsPublic:
    def test_list_incidents(self):
        r = requests.get(f"{API}/incidents")
        assert r.status_code == 200
        body = r.json()
        assert "items" in body and body["total"] >= 1
        # ensure no possible_duplicates key leaked
        for i in body["items"]:
            assert "possible_duplicates" not in i

    def test_list_filters(self):
        r = requests.get(f"{API}/incidents", params={"category": "potholes", "severity": "high"})
        assert r.status_code == 200
        for i in r.json()["items"]:
            assert i["category"] == "potholes"

    def test_incident_detail(self, citizen):
        iid = citizen["first_incident_id"]
        r = requests.get(f"{API}/incidents/{iid}")
        assert r.status_code == 200
        body = r.json()
        assert body["incident_id"] == iid
        assert "timeline" in body
        assert "report_count" in body
        assert "possible_duplicates" not in body


# ---------- community: confirm / follow ----------
class TestCommunity:
    def test_confirm_idempotent(self, citizen):
        s2, _, _, _ = _register()
        iid = citizen["first_incident_id"]
        r1 = s2.post(f"{API}/incidents/{iid}/confirm")
        assert r1.status_code == 200
        c1 = r1.json()["confirmation_count"]
        r2 = s2.post(f"{API}/incidents/{iid}/confirm")
        assert r2.status_code == 200
        c2 = r2.json()["confirmation_count"]
        assert c2 == c1  # idempotent, no increment

    def test_follow_unfollow(self, citizen):
        s2, _, _, _ = _register()
        iid = citizen["first_incident_id"]
        r = s2.post(f"{API}/incidents/{iid}/follow")
        assert r.status_code == 200 and r.json()["following"] is True
        # duplicate follow still returns following true, no change
        r2 = s2.post(f"{API}/incidents/{iid}/follow")
        assert r2.json()["following"] is True
        r3 = s2.delete(f"{API}/incidents/{iid}/follow")
        assert r3.status_code == 200 and r3.json()["following"] is False


# ---------- authority workflow ----------
class TestAuthorityWorkflow:
    def test_stats(self, authority_session):
        r = authority_session.get(f"{API}/authority/stats")
        assert r.status_code == 200
        body = r.json()
        for k in ("total_reports", "awaiting_review", "total_incidents",
                  "by_status", "by_severity", "recent_reports"):
            assert k in body

    def test_full_incident(self, authority_session, citizen):
        iid = citizen["first_incident_id"]
        r = authority_session.get(f"{API}/incidents/{iid}/full")
        assert r.status_code == 200
        body = r.json()
        assert "incident" in body and "reports" in body and "notes" in body
        assert "allowed_transitions" in body

    def test_invalid_transition(self, authority_session, citizen):
        iid = citizen["first_incident_id"]
        # Verify current status is 'reported' before testing invalid jump
        det = requests.get(f"{API}/incidents/{iid}").json()
        print(f"\n[invalid_transition] incident {iid} current status={det.get('status')}")
        r = authority_session.patch(f"{API}/incidents/{iid}/status",
                                    json={"status": "resolved"})
        print(f"[invalid_transition] response: {r.status_code} {r.text}")
        assert r.status_code == 400

    def test_lifecycle_and_notify(self, authority_session, citizen):
        iid = citizen["first_incident_id"]
        # citizen follows for notification check
        follow = citizen["session"].post(f"{API}/incidents/{iid}/follow")
        assert follow.status_code == 200

        # reported -> under_review
        r = authority_session.patch(f"{API}/incidents/{iid}/status",
                                    json={"status": "under_review"})
        assert r.status_code == 200, r.text
        # -> verified
        r = authority_session.patch(f"{API}/incidents/{iid}/status",
                                    json={"status": "verified"})
        assert r.status_code == 200
        # assign (verified -> assigned)
        depts = requests.get(f"{API}/departments").json()
        assert depts, "no departments seeded"
        dept_key = depts[0]["key"]
        r = authority_session.post(f"{API}/incidents/{iid}/assign",
                                   json={"department": dept_key})
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "assigned"
        # -> in_progress
        r = authority_session.patch(f"{API}/incidents/{iid}/status",
                                    json={"status": "in_progress"})
        assert r.status_code == 200
        # -> resolved
        r = authority_session.patch(f"{API}/incidents/{iid}/status",
                                    json={"status": "resolved", "note": "Fixed"})
        assert r.status_code == 200

        time.sleep(1)
        # citizen notifications has entries referencing this incident
        notifs = citizen["session"].get(f"{API}/notifications").json()
        assert notifs["unread_count"] >= 1
        matched = [n for n in notifs["items"] if n.get("incident_id") == iid]
        assert matched, "no notification for status change was created"

    def test_add_note_internal(self, authority_session, citizen):
        iid = citizen["first_incident_id"]
        r = authority_session.post(f"{API}/incidents/{iid}/notes",
                                   json={"note": "Private authority note"})
        assert r.status_code == 200
        # public endpoint must not expose it
        pub = requests.get(f"{API}/incidents/{iid}").json()
        assert "notes" not in pub
        # also check reporter email not in public
        assert "reporter_email" not in str(pub)


# ---------- notifications ----------
class TestNotifications:
    def test_list_and_mark(self, citizen):
        r = citizen["session"].get(f"{API}/notifications")
        assert r.status_code == 200
        body = r.json()
        if body["items"]:
            nid = body["items"][0]["id"]
            r2 = citizen["session"].post(f"{API}/notifications/{nid}/read")
            assert r2.status_code == 200
        r3 = citizen["session"].post(f"{API}/notifications/read-all")
        assert r3.status_code == 200
        r4 = citizen["session"].get(f"{API}/notifications").json()
        assert r4["unread_count"] == 0


# ---------- admin ----------
class TestAdmin:
    def test_admin_stats(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats")
        assert r.status_code == 200
        body = r.json()
        for k in ("total_incidents", "open", "in_progress", "resolved",
                  "new_this_week", "total_users", "total_reports", "priority_incidents"):
            assert k in body

    def test_users_list(self, admin_session):
        r = admin_session.get(f"{API}/admin/users")
        assert r.status_code == 200
        users = r.json()
        assert any(u["email"] == ADMIN_EMAIL for u in users)

    def test_role_change(self, admin_session):
        # create a target user
        s, email, pw, u = _register()
        r = admin_session.patch(f"{API}/admin/users/{u['user_id']}/role",
                                json={"role": "authority"})
        assert r.status_code == 200
        assert r.json()["role"] == "authority"
        # revert
        admin_session.patch(f"{API}/admin/users/{u['user_id']}/role", json={"role": "citizen"})

    def test_cannot_disable_self(self, admin_session):
        users = admin_session.get(f"{API}/admin/users").json()
        admin_user = next(u for u in users if u["email"] == ADMIN_EMAIL)
        r = admin_session.patch(f"{API}/admin/users/{admin_user['user_id']}/status",
                                json={"status": "disabled"})
        assert r.status_code == 400

    def test_disable_other_user(self, admin_session):
        s, email, pw, u = _register()
        r = admin_session.patch(f"{API}/admin/users/{u['user_id']}/status",
                                json={"status": "disabled"})
        assert r.status_code == 200
        # re-enable
        admin_session.patch(f"{API}/admin/users/{u['user_id']}/status", json={"status": "active"})

    def test_audit_logs(self, admin_session):
        r = admin_session.get(f"{API}/admin/audit-logs")
        assert r.status_code == 200
        assert "items" in r.json()

    def test_category_create_update(self, admin_session):
        key = f"test_cat_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{API}/categories",
                               json={"name": "Test Category", "key": key, "color": "#123456"})
        assert r.status_code == 200
        r2 = admin_session.put(f"{API}/categories/{key}",
                               json={"name": "Updated", "color": "#000000", "active": True})
        assert r2.status_code == 200
        assert r2.json()["name"] == "Updated"

    def test_department_create(self, admin_session):
        key = f"test_dept_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{API}/departments",
                               json={"name": "Test Dept", "key": key, "description": "x"})
        assert r.status_code == 200
