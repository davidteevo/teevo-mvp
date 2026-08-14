import { Resend } from "resend";
import fs from "fs";
import path from "path";
import { isStaging } from "@/lib/app-env";

/**
 * Single entrypoint for sending email via the Resend platform.
 * All app emails (auth hook + transactional) go through this module and Resend's API.
 * Configure: RESEND_API_KEY (required), optional RESEND_FROM (e.g. "Teevo <hello@yourdomain.com>").
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM?.trim() || "Teevo <hello@teevohq.com>";
const STAGING_SUBJECT_PREFIX = "[TEEVO TEST]";

function getResend(): Resend {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set; cannot send email via Resend.");
  }
  return new Resend(RESEND_API_KEY);
}

export type EmailType = "transactional" | "standard" | "alert";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Optional listing photo block for email templates. Empty when there is no image. */
export function listingHeroImageHtml(
  imageUrl: string | null | undefined,
  alt = "Listing photo"
): string {
  if (!imageUrl) return "";
  return `<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 14px 0"><tr><td align="center"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" width="200" style="display:block;width:200px;max-width:200px;height:auto;border-radius:12px;border:none;outline:none;text-decoration:none" /></td></tr></table>`;
}

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
  return out.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "");
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

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

/**
 * Sends an email using a base template (transactional, standard, or alert).
 * Loads the template, replaces {{placeholder}} with variables, and sends via Resend.
 */
export async function sendEmail({
  type,
  to,
  subject,
  variables = {},
  attachments,
}: {
  type: EmailType;
  to: string | string[];
  subject: string;
  variables?: Record<string, string>;
  attachments?: EmailAttachment[];
}) {
  const rawHtml = loadTemplate(type);
  const prepared: Record<string, string> = { hero_image: "", item_name: "", ...variables };
  if (prepared.item_name) prepared.item_name = escapeHtml(prepared.item_name);
  if (prepared.body) prepared.body = prepared.body.replace(/\r\n/g, "\n").replace(/\n/g, "<br />");
  const html = render(rawHtml, prepared);

  let finalSubject = subject;
  if (isStaging() && !subject.startsWith(STAGING_SUBJECT_PREFIX)) {
    finalSubject = `${STAGING_SUBJECT_PREFIX} ${subject}`;
  }

  const toList = (Array.isArray(to) ? to : [to])
    .map((e) => e.trim())
    .filter(Boolean);

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to: toList,
    subject: finalSubject,
    html,
    ...(attachments?.length
      ? {
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          })),
        }
      : {}),
  });

  if (error) {
    throw new Error(error.message);
  }
}
