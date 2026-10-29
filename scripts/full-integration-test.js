const BASE = "http://localhost:5000/api/v1";

async function request(path, options = {}) {
  const response = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  let data = null;
  try {
    data = await response.json();
  } catch {}

  return {
    status: response.status,
    data
  };
}

function unwrap(body) {
  return body?.data ?? body;
}

async function main() {
  const results = [];

  function test(name, ok, detail = "") {
    results.push({ name, ok, detail });
    console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
  }

  console.log("\n======================================");
  console.log(" TEAMKANBAN FULL INTEGRATION TEST");
  console.log("======================================\n");

  // --------------------------------------------------
  // 1. HEALTH + DATABASE
  // --------------------------------------------------

  try {
    const r = await request("/health");

    test(
      "API + MySQL Health",
      r.status === 200 && r.data?.database === "connected",
      r.data?.database || `HTTP ${r.status}`
    );
  } catch (e) {
    test("API + MySQL Health", false, e.message);
  }

  // --------------------------------------------------
  // 2. LOGIN
  // --------------------------------------------------

  let token = null;

  try {
    const r = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "pranathi@teamkanban.local",
        password: "password"
      })
    });

    token = r.data?.token;

    test(
      "Authentication / Login",
      r.status === 200 && !!token,
      r.data?.user?.email || `HTTP ${r.status}`
    );
  } catch (e) {
    test("Authentication / Login", false, e.message);
  }

  if (!token) {
    console.log("\n❌ Login failed. Cannot continue authenticated tests.");
    process.exit(1);
  }

  const auth = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  // --------------------------------------------------
  // 3. CURRENT USER
  // --------------------------------------------------

  try {
    const r = await request("/me", auth);

    const user = unwrap(r.data);

    test(
      "Current User / JWT",
      r.status === 200 && !!user,
      user?.role || `HTTP ${r.status}`
    );
  } catch (e) {
    test("Current User / JWT", false, e.message);
  }

  // --------------------------------------------------
  // 4. PROJECTS
  // --------------------------------------------------

  let projectId = null;

  try {
    const r = await request("/projects", auth);

    const projects = unwrap(r.data);

    projectId = Array.isArray(projects)
      ? projects[0]?.id
      : projects?.[0]?.id;

    test(
      "Projects API",
      r.status === 200 &&
      Array.isArray(projects) &&
      projects.length > 0,
      `${Array.isArray(projects) ? projects.length : 0} project(s)`
    );
  } catch (e) {
    test("Projects API", false, e.message);
  }

  // --------------------------------------------------
  // PROJECT-DEPENDENT TESTS
  // --------------------------------------------------

  if (projectId) {

    // ------------------------------------------------
    // 5. TASKS
    // ------------------------------------------------

    try {
      const r = await request(
        `/projects/${projectId}/tasks`,
        auth
      );

      const tasks = unwrap(r.data);

      test(
        "Tasks API / MySQL",
        r.status === 200 && Array.isArray(tasks),
        `${Array.isArray(tasks) ? tasks.length : 0} task(s)`
      );
    } catch (e) {
      test("Tasks API / MySQL", false, e.message);
    }

    // ------------------------------------------------
    // 6. ACTIVITY
    // ------------------------------------------------

    try {
      const r = await request(
        `/projects/${projectId}/activity`,
        auth
      );

      const activity = unwrap(r.data);

      test(
        "Activity Logs API",
        r.status === 200 && Array.isArray(activity),
        `${Array.isArray(activity) ? activity.length : 0} activity record(s)`
      );
    } catch (e) {
      test("Activity Logs API", false, e.message);
    }

    // ------------------------------------------------
    // 7. ANALYTICS
    // ------------------------------------------------

    try {
      const r = await request(
        `/projects/${projectId}/analytics`,
        auth
      );

      test(
        "Analytics API",
        r.status === 200,
        `HTTP ${r.status}`
      );
    } catch (e) {
      test("Analytics API", false, e.message);
    }

    // ------------------------------------------------
    // 8. NOTIFICATIONS
    // ------------------------------------------------

    try {
      const r = await request(
        `/projects/${projectId}/notifications`,
        auth
      );

      test(
        "Notifications API",
        r.status === 200,
        `HTTP ${r.status}`
      );
    } catch (e) {
      test("Notifications API", false, e.message);
    }

    // ------------------------------------------------
    // 9. COMMENTS
    // ------------------------------------------------

    try {
      const r = await request(
        `/projects/${projectId}/comments`,
        auth
      );

      test(
        "Comments API",
        r.status === 200,
        `HTTP ${r.status}`
      );
    } catch (e) {
      test("Comments API", false, e.message);
    }

    // ------------------------------------------------
    // 10. PROJECT ANALYTICS DATA
    // ------------------------------------------------

    try {
      const r = await request(
        `/projects/${projectId}/analytics`,
        auth
      );

      const analytics = unwrap(r.data);

      test(
        "Analytics Data",
        r.status === 200 && !!analytics,
        "analytics payload received"
      );
    } catch (e) {
      test("Analytics Data", false, e.message);
    }

  } else {
    test(
      "Project-dependent APIs",
      false,
      "No project ID returned"
    );
  }

  // --------------------------------------------------
  // 11. FRONTEND
  // --------------------------------------------------

  try {
    const r = await fetch("http://localhost:5000/");
    const html = await r.text();

    test(
      "Frontend Dashboard",
      r.status === 200 &&
      html.toLowerCase().includes("teamkanban"),
      `HTTP ${r.status}`
    );
  } catch (e) {
    test("Frontend Dashboard", false, e.message);
  }

  // --------------------------------------------------
  // 12. SOCKET.IO
  // --------------------------------------------------

  try {
    const r = await fetch(
      "http://localhost:5000/socket.io/?EIO=4&transport=polling"
    );

    test(
      "Socket.IO",
      r.status === 200,
      `HTTP ${r.status}`
    );
  } catch (e) {
    test("Socket.IO", false, e.message);
  }

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  console.log("\n======================================");
  console.log(" TEST SUMMARY");
  console.log("======================================");

  const passed = results.filter(x => x.ok).length;
  const failed = results.filter(x => !x.ok).length;

  console.log(`Passed : ${passed}`);
  console.log(`Failed : ${failed}`);
  console.log(`Total  : ${results.length}`);

  if (failed === 0) {
    console.log("\n🎉 ALL INTEGRATION TESTS PASSED");
  } else {
    console.log("\n⚠️ SOME TESTS NEED ATTENTION");

    console.log("\nFailed tests:");

    results
      .filter(x => !x.ok)
      .forEach(x => {
        console.log(`❌ ${x.name} — ${x.detail}`);
      });
  }
}

main().catch(err => {
  console.error("\n❌ Test runner failed:", err);
  process.exit(1);
});
