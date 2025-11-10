import { NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongoDB/mongoDB";
import { guid } from "@/lib/Utils";
import { ObjectId } from "mongodb";

// removes “control characters” from a string s
function stripControlChars(s: string) {
  return s.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
}

// cleans HTML input to prevent XSS attacks
function sanitizeHTML(input: unknown): string {
  /**
   *  If the input isn’t a string, return an empty string.
   * Prevents errors when non-string data is passed.
   */
  if (typeof input !== "string") return "";
  let s = input;

  // invoke the fn stripControlChars; normalize & remove control characters
  s = stripControlChars(s);

  /**
   * Remove dangerous tags and their content
   * Target tags that can run malicious code: script, style, iframe, object, embed
   */
  s = s.replace(
    /<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ""
  );

  // remove event handler attributes e.g., onclick, onload
  s = s.replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "");

  /**
   * Disarm dangerous URIs
   * Converts href="javascript:..." or src="data:..." to a harmless href="#".
   * Prevents JS execution via links or images.
   */
  s = s.replace(
    /(href|src)\s*=\s*(["'])\s*(javascript:|data:)[^"']*\2/gi,
    '$1="#"'
  );
  /**
   * Remove other dangerous tags
   * Tags that could college user input, load external content, include media that could be abuse
   */
  s = s.replace(
    /<\/?\s*(meta|link|base|form|input|button|textarea|select|option|video|audio|source|track|details|summary)[^>]*>/gi,
    ""
  );
  // allow only a safe subset of tags; escape others by replacing < with &lt; when not allowed
  const allowed =
    /^(p|br|b|strong|i|em|u|ul|ol|li|blockquote|code|pre|span|div|h1|h2|h3|h4|h5|h6|a)$/i;

  /**
   * Filter attributes of allow tags
   * Keeps only safe attributes: href, title, target, rel.
   * Strips everything else.
   */
  s = s.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, tag, attrs) => {
    if (!allowed.test(tag)) return match.replace(/</g, "&lt;");
    // in allowed tags, keep only safe attributes (href, title, target, rel) and strip others
    const safeAttr = [] as string[];
    const attrRegex = /(\w[\w-]*)\s*=\s*(["']).*?\2/g;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(attrs))) {
      const name = m[1].toLowerCase();
      if (
        name === "href" ||
        name === "title" ||
        name === "target" ||
        name === "rel"
      ) {
        // already sanitized javascript: above
        safeAttr.push(`${m[0]}`);
      }
    }
    const space = safeAttr.length ? " " : "";
    return `<${match.startsWith("</") ? "/" : ""}${tag}${space}${safeAttr.join(
      " "
    )}>`;
  });
  return s; // return sanitized string
}

/**
 * Takes any input, ensures it’s a string, removes control characters, trims spaces, and optionally limits its length.
 */
function sanitizeText(input: unknown, { maxLen }: { maxLen?: number } = {}) {
  let s = typeof input === "string" ? input : "";
  s = stripControlChars(s).trim();
  if (maxLen && s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

// Check if valid object
function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
}

// Converts a value into a valid number, or returns undefined if it’s not a proper number.
function parseNumber(n: unknown) {
  if (typeof n === "number") return n;
  if (typeof n === "string" && n.trim() !== "") {
    const v = Number(n);
    return Number.isFinite(v) ? v : undefined;
  }
  return undefined;
}

// takes a user object and cleans up its image, name, and email fields to make sure they are safe strings and not too long.
function sanitizeUserInfo(input: any) {
  const out: { image?: string; name?: string; email?: string } = {};
  if (input && typeof input === "object") {
    if (typeof input.image === "string")
      out.image = sanitizeText(input.image, { maxLen: 500 });
    if (typeof input.name === "string")
      out.name = sanitizeText(input.name, { maxLen: 120 });
    if (typeof input.email === "string")
      out.email = sanitizeText(input.email, { maxLen: 200 });
  }
  return out;
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();

    // Basic presence checks
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Validate orgID early
    if (!isValidObjectId(raw.orgID)) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    // Sanitize and validate fields
    const jobTitle = sanitizeText(raw.jobTitle, { maxLen: 120 });
    const description = sanitizeHTML(raw.description);
    const location = sanitizeText(raw.location, { maxLen: 160 });
    const workSetup = sanitizeText(raw.workSetup, { maxLen: 32 });
    const workSetupRemarks = sanitizeHTML(raw.workSetupRemarks);
    const screeningSetting = sanitizeText(raw.screeningSetting, { maxLen: 64 });
    const status = sanitizeText(raw.status || "active", { maxLen: 16 });
    const country = sanitizeText(raw.country, { maxLen: 80 });
    const province = sanitizeText(raw.province, { maxLen: 120 });
    const employmentType = sanitizeText(raw.employmentType, { maxLen: 32 });
    const lastEditedBy = sanitizeUserInfo(raw.lastEditedBy);
    const createdBy = sanitizeUserInfo(raw.createdBy);
    const salaryNegotiable = Boolean(raw.salaryNegotiable);
    const requireVideo = raw.requireVideo === false ? false : true;
    const lastStep = typeof raw.lastStep === "number" ? raw.lastStep : Number(raw.lastStep);
    const orgID = raw.orgID as string;

    // Enums and constraints
    const validWorkSetup = ["Fully Remote", "Onsite", "Hybrid"];
    const validEmploymentType = ["Full-Time", "Part-Time"];
    const validStatus = ["active", "inactive"];
    if (!jobTitle || !description || !location || !workSetup) {
      return NextResponse.json(
        { error: "jobTitle, description, location and workSetup are required" },
        { status: 400 }
      );
    }
    if (!validWorkSetup.includes(workSetup)) {
      return NextResponse.json({ error: "Invalid workSetup" }, { status: 400 });
    }
    if (employmentType && !validEmploymentType.includes(employmentType)) {
      return NextResponse.json(
        { error: "Invalid employmentType" },
        { status: 400 }
      );
    }
    if (status && !validStatus.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (!Number.isFinite(lastStep) || lastStep < 1 || lastStep > 10) {
      return NextResponse.json({ error: "Invalid lastStep" }, { status: 400 });
    }

    // Numbers
    const minimumSalary = parseNumber(raw.minimumSalary);
    const maximumSalary = parseNumber(raw.maximumSalary);
    if (
      (minimumSalary !== undefined && minimumSalary < 0) ||
      (maximumSalary !== undefined && maximumSalary < 0)
    ) {
      return NextResponse.json(
        { error: "Salary cannot be negative" },
        { status: 400 }
      );
    }
    if (
      minimumSalary !== undefined &&
      maximumSalary !== undefined &&
      minimumSalary > maximumSalary
    ) {
      return NextResponse.json(
        { error: "minimumSalary cannot be greater than maximumSalary" },
        { status: 400 }
      );
    }

    // Questions: ensure array and sanitize any string fields deeply but conservatively
    let questions: any = Array.isArray(raw.questions) ? raw.questions : [];
    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: "questions must be an array" },
        { status: 400 }
      );
    }
    const sanitizeDeep = (val: any): any => {
      if (typeof val === "string") return sanitizeText(val, { maxLen: 1000 });
      if (Array.isArray(val)) return val.map(sanitizeDeep);
      if (val && typeof val === "object") {
        const out: Record<string, any> = {};
        for (const k of Object.keys(val)) out[k] = sanitizeDeep(val[k]);
        return out;
      }
      return val;
    };
    questions = sanitizeDeep(questions);

    // Pre-screening questions: optional but if provided, validate and sanitize
    let preScreeningQuestions: any[] = Array.isArray(raw.preScreeningQuestions)
      ? raw.preScreeningQuestions
      : [];
    const allowedTypes = new Set([
      "dropdown",
      "range",
      "short-answer",
      "long-answer",
      "checkboxes",
    ]);
    const sanitizePreQ = (q: any, idx: number) => {
      const out: any = {};
      if (q && typeof q === "object") {
        out.id = sanitizeText(q.id || `q-${idx}`, { maxLen: 64 });
        out.question = sanitizeText(q.question, { maxLen: 1000 });
        const t = sanitizeText(q.type, { maxLen: 32 });
        out.type = allowedTypes.has(t) ? t : "short-answer";
        if (out.type === "dropdown" || out.type === "checkboxes") {
          out.options = Array.isArray(q.options)
            ? q.options
                .map((o: any) => sanitizeText(o, { maxLen: 200 }))
                .filter((s: string) => s)
            : [];
        }
        if (out.type === "range") {
          const min = parseNumber(q.min);
          const max = parseNumber(q.max);
          out.min = typeof min === "number" && min >= 0 ? min : 0;
          out.max = typeof max === "number" && max >= out.min ? max : out.min;
          out.currency =
            sanitizeText(q.currency || "PHP", { maxLen: 8 }) || "PHP";
        }
        out.required = q?.required === false ? false : true;
      }
      return out;
    };
    if (preScreeningQuestions.length > 0) {
      preScreeningQuestions = preScreeningQuestions
        .map(sanitizePreQ)
        .filter((q) => q.question);
    }

    const { db } = await connectMongoDB();

    const orgDetails = await db
      .collection("organizations")
      .aggregate([
        {
          $match: {
            _id: new ObjectId(orgID),
          },
        },
        {
          $lookup: {
            from: "organization-plans",
            let: { planId: "$planId" },
            pipeline: [
              {
                $addFields: {
                  _id: { $toString: "$_id" },
                },
              },
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$planId"] },
                },
              },
            ],
            as: "plan",
          },
        },
        {
          $unwind: "$plan",
        },
      ])
      .toArray();

    if (!orgDetails || orgDetails.length === 0) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const totalActiveCareers = await db
      .collection("careers")
      .countDocuments({ orgID, status: "active" });

    if (
      totalActiveCareers >=
      orgDetails[0].plan.jobLimit + (orgDetails[0].extraJobSlots || 0)
    ) {
      return NextResponse.json(
        { error: "You have reached the maximum number of jobs for your plan" },
        { status: 400 }
      );
    }

    const career = {
      id: guid(),
      jobTitle,
      description,
      questions,
      preScreeningQuestions,
      location,
      workSetup,
      workSetupRemarks,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastEditedBy,
      createdBy,
      status: status || "active",
      screeningSetting,
      orgID,
      requireVideo,
      lastActivityAt: new Date(),
      salaryNegotiable,
      minimumSalary,
      maximumSalary,
      country,
      province,
      employmentType,
      lastStep,
    };

    const result = await db.collection("careers").insertOne(career);

    // return NextResponse.json({
    //   message: "Career added successfully",
    //   career,
    // });

    return NextResponse.json({
      message: "Career added successfully",
      career: { ...career, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Error adding career:", error);
    return NextResponse.json(
      { error: "Failed to add career" },
      { status: 500 }
    );
  }
}
