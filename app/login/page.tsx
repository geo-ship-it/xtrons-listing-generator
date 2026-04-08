"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_CONFIG, RoleName } from "../lib/roleConfig";

const ROLES = [
  { name: "Geo" as RoleName, password: "6868" },
  { name: "Japan" as RoleName, password: "7878" },
  { name: "Ebay" as RoleName, password: "8888" },
  { name: "Amazon" as RoleName, password: "9999" },
  { name: "SEO" as RoleName, password: "3333" },
  { name: "Trading" as RoleName, password: "6789" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  const handleLogin = () => {
    if (!selectedRole) {
      setError("Please select a role");
      return;
    }

    const role = ROLES.find((r) => r.name === selectedRole);
    if (!role) {
      setError("Invalid role");
      return;
    }

    if (password !== role.password) {
      setError("Incorrect password");
      return;
    }

    // Store role in localStorage
    localStorage.setItem("userRole", role.name);
    localStorage.setItem("allowedModules", JSON.stringify(ROLE_CONFIG[role.name].allowedModules));

    router.push("/");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E5E5E7", padding: "32px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#1d1d1f", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px", margin: "0 auto 12px" }}>
              X
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1d1d1f", marginBottom: 4 }}>XTRONS Listing Generator</h1>
            <p style={{ fontSize: 13, color: "#6E6E73" }}>Select your role to continue</p>
          </div>

          {/* Role Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73", display: "block", marginBottom: 10 }}>
              Role
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {ROLES.map((role) => (
                <button
                  key={role.name}
                  onClick={() => {
                    setSelectedRole(role.name);
                    setError("");
                  }}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: selectedRole === role.name ? "2px solid #0071E3" : "1px solid #E5E5E7",
                    background: selectedRole === role.name ? "#EAF3FF" : "#F5F5F7",
                    color: selectedRole === role.name ? "#0071E3" : "#1d1d1f",
                    fontSize: 14,
                    fontWeight: selectedRole === role.name ? 600 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    fontFamily: "inherit",
                  }}
                >
                  {role.name}
                </button>
              ))}
            </div>
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73", display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Enter password"
              style={{
                width: "100%",
                background: inputFocused ? "#FFFFFF" : "#F5F5F7",
                border: "none",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 14,
                color: "#1d1d1f",
                outline: "none",
                transition: "box-shadow 0.15s ease, background 0.15s ease",
                fontFamily: "inherit",
                boxShadow: inputFocused ? "0 0 0 3px rgba(0, 113, 227, 0.25)" : "none",
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "#FFF2F0", border: "1px solid #FFCCC7", borderRadius: 10, fontSize: 13, color: "#FF3B30" }}>
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={!selectedRole || !password}
            style={{
              width: "100%",
              height: 44,
              background: !selectedRole || !password ? "#E5E5E7" : "#0071E3",
              color: !selectedRole || !password ? "#AEAEB2" : "#FFFFFF",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: !selectedRole || !password ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s ease",
            }}
          >
            Login
          </button>

          {/* Footer */}
          <p style={{ marginTop: 20, fontSize: 12, color: "#AEAEB2", textAlign: "center" }}>
            Each role has access to specific marketplaces and content types
          </p>
        </div>
      </div>
    </div>
  );
}
