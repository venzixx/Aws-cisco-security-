import { simulatorConfig } from "../config.js";

function headers(ip: string) {
  return {
    "x-forwarded-for": ip
  };
}

export async function runFailedLoginBurst() {
  const results = [];

  for (let index = 0; index < 6; index += 1) {
    const response = await fetch(`${simulatorConfig.sourceBaseUrl}/login`, {
      method: "POST",
      headers: {
        ...headers("203.0.113.10"),
        "content-type": "application/json"
      },
      body: JSON.stringify({
        username: "admin",
        password: `wrong-${index}`
      })
    });

    results.push(response.status);
  }

  return `Failed login burst sent. Status codes: ${results.join(", ")}`;
}

export async function runAdminProbe() {
  const admin = await fetch(`${simulatorConfig.sourceBaseUrl}/admin`, {
    headers: headers("198.51.100.23")
  });
  const backup = await fetch(`${simulatorConfig.sourceBaseUrl}/config-backup`, {
    headers: headers("198.51.100.23")
  });

  return `Admin probe completed. /admin=${admin.status}, /config-backup=${backup.status}`;
}

export async function runTrafficSpike() {
  const requests = Array.from({ length: 28 }, (_, index) =>
    fetch(`${simulatorConfig.sourceBaseUrl}/api/public?burst=${index}`, {
      headers: headers("198.51.100.77")
    }).then((response) => response.status)
  );

  const results = await Promise.all(requests);
  const blocked = results.filter((status) => status === 429).length;
  return `Rate-limit spike completed. Success=${results.filter((status) => status === 200).length}, blocked=${blocked}`;
}

export async function runPathEnumeration() {
  const suspiciousPaths = ["/.env", "/wp-admin", "/phpmyadmin", "/server-status"];
  const results = await Promise.all(
    suspiciousPaths.map((path) =>
      fetch(`${simulatorConfig.sourceBaseUrl}${path}`, {
        headers: headers("192.0.2.55")
      }).then((response) => `${path}:${response.status}`)
    )
  );

  return `Path enumeration completed. Results: ${results.join(", ")}`;
}
