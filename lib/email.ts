import { Resend } from "resend";
import fs from "fs";
import path from "path";

const resend = new Resend(process.env.RESEND_API_KEY!);

export type EmailType = "transactional" | "standard" | "alert";

/**
 * Replaces {{placeholder}} in a template string with values from variables.
 * @param templateString - Raw HTML (or any string) containing {{key}} placeholders
 * @param variables - Map of placeholder name -> value (e.g. { title: "Hello" } for {{title}})
 * @returns Final string with all placeholders replaced (missing keys become empty string)
 */
export function render(
  templateString: string,
  variables: Record<string, string>
): string {
  let out = templateString;
  Object.keys(variables).forEach((key) => {
    const value = variables[key] ?? "";
    out = out.replace(new RegExp(`{{${key}}}`, "g"), value);
  });
  return out;
}

function getTemplatePath(type: EmailType): string {
  return path.join(process.cwd(), "lib", "email-templates", `${type}.html`);
}

function loadTemplate(type: EmailType): string {
  const filePath = getTemplatePath(type);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Email template not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Sends an email using a base template (transactional, standard, or alert).
 * Loads the template, replaces {{placeholder}} with variables, and sends via Resend.
 */
export async function sendEmail({
  type,
  to,
  subject,
  variables = {},
}: {
  type: EmailType;
  to: string;
  subject: string;
  variables?: Record<string, string>;
}) {
  const rawHtml = loadTemplate(type);
  const html = render(rawHtml, variables);

  const { error } = await resend.emails.send({
    from: "Teevo <hello@teevohq.com>",
    to: [to],
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
