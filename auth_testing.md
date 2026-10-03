# AddisFix Auth Testing Notes

Admin: dagmawiaddisu94@gmail.com / AddisFix@2026 (role admin)
Demo authority: demo.authority@addisfix.demo / Demo@2026
Demo citizens: demo.abebe@addisfix.demo / Demo@2026 (also sara, dawit)

Auth model: email/password -> JWT httpOnly cookies (access_token + refresh_token).
Google -> session_token cookie. get_current_user accepts either. Use withCredentials / -c -b cookie jars.

Endpoints: /api/auth/{register,login,logout,me,refresh,forgot-password,reset-password,google/session}

Key flows to verify:
- register sets cookies and returns user; admin email auto-gets admin role
- login/me with cookie jar
- unauthorized access to protected endpoints returns 401
- citizen cannot call authority/admin endpoints (403)
- forgot-password returns identical generic 200 for registered & unregistered
- reset-password with a token (token link printed to backend log only when FRONTEND_URL is http://localhost)
