import assert from "node:assert/strict";
import test from "node:test";
import { buildInvitationEmail, escapeHtml } from "../src/mailer.js";

test("escapeHtml neutralises markup characters", () => {
  assert.equal(escapeHtml(`<b>"Tom" & 'Jerry'</b>`), "&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;");
});

test("invitation email does not render workspace names as HTML", () => {
  const email = buildInvitationEmail({
    workspaceName: `<a href="https://evil.example">Click</a>`,
    invitationUrl: "https://relay.example/invite/abc123"
  });
  assert.ok(!email.html.includes("evil.example\">"));
  assert.ok(email.html.includes("&lt;a href=&quot;https://evil.example&quot;&gt;Click&lt;/a&gt;"));
  assert.ok(email.html.includes(`href="https://relay.example/invite/abc123"`));
});
