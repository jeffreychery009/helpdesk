import "dotenv/config";
import prisma from "./lib/prisma";
import {
  TicketStatus,
  TicketCategory,
} from "./generated/prisma/client";

const statuses: TicketStatus[] = ["NEW", "OPEN", "RESOLVED", "CLOSED"];
const categories: TicketCategory[] = [
  "GENERAL_QUESTION",
  "TECHNICAL_QUESTION",
  "REFUND_REQUEST",
];

const firstNames = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "James", "Sophia", "William",
  "Isabella", "Oliver", "Mia", "Benjamin", "Charlotte", "Lucas", "Amelia",
  "Henry", "Harper", "Alexander", "Evelyn", "Daniel",
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
];

const domains = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
  "protonmail.com", "aol.com", "fastmail.com",
];

const generalQuestions = [
  { subject: "How do I update my billing information?", body: "Hi, I need to update the credit card on file for my account. I recently got a new card and want to make sure my subscription continues without interruption. Can you walk me through the steps?" },
  { subject: "What are your business hours?", body: "Hello, I'm trying to reach your support team by phone but I'm not sure what hours you operate. Could you let me know your business hours and the best number to call?" },
  { subject: "Can I upgrade my plan mid-cycle?", body: "I'm currently on the Basic plan but I'd like to upgrade to Pro. If I upgrade now, will I be charged the full price or a prorated amount for the rest of the billing cycle?" },
  { subject: "How do I add team members to my account?", body: "Our team just hired two new people and I need to add them to our company account. What's the process for adding new users, and is there an additional cost per seat?" },
  { subject: "Where can I find my invoices?", body: "I need to download my invoices from the past 6 months for our accounting department. Can you point me to where I can access them in my account?" },
  { subject: "Do you offer educational discounts?", body: "I'm a professor at a university and I'd like to use your platform for my research lab. Do you offer any academic or educational pricing?" },
  { subject: "How do I change my account email?", body: "I recently changed jobs and need to update my login email from my old work email to my new one. Is this something I can do myself or do I need help from support?" },
  { subject: "What's included in the Enterprise plan?", body: "We're evaluating your Enterprise plan for our organization of about 200 employees. Could you send me a detailed breakdown of what's included compared to the Pro plan?" },
  { subject: "Account verification taking too long", body: "I submitted my account verification documents three days ago and haven't heard back. How long does the verification process usually take?" },
  { subject: "Can I export my data?", body: "I need to export all of my project data for a compliance audit. Do you support data export, and if so, what formats are available?" },
  { subject: "How does your referral program work?", body: "I heard you have a referral program. How does it work? What do I get for referring a friend, and is there a limit on referrals?" },
  { subject: "Cancellation policy question", body: "I'm considering cancelling my subscription. Is there a cancellation fee, and will I lose access immediately or at the end of my billing period?" },
  { subject: "Multi-language support?", body: "Does your platform support languages other than English? We have team members in Japan and Brazil who would need to use the interface in their native languages." },
  { subject: "API rate limits", body: "We're planning to integrate your API into our workflow. What are the rate limits for API calls on the Pro plan? We expect to make around 10,000 requests per day." },
  { subject: "How to set up two-factor authentication", body: "I'd like to enable 2FA on my account for extra security. What authentication methods do you support — authenticator app, SMS, or both?" },
];

const technicalQuestions = [
  { subject: "Integration with Slack not working", body: "I set up the Slack integration yesterday but notifications aren't coming through to our channel. I've reconnected the integration twice and the webhook URL looks correct. Can you help troubleshoot?" },
  { subject: "API returns 500 error on POST request", body: "I'm getting a 500 Internal Server Error when making POST requests to /api/v2/projects. GET requests work fine. Here's the payload I'm sending: {\"name\": \"test\", \"type\": \"standard\"}. Started happening about 2 hours ago." },
  { subject: "CSV import failing with large files", body: "I'm trying to import a CSV file with about 50,000 rows but the import fails every time around the 30,000 row mark. Smaller files work fine. Is there a file size or row limit I should know about?" },
  { subject: "SSO configuration help needed", body: "We're trying to set up SAML SSO with Okta but keep getting an 'Invalid SAML Response' error. We've double-checked the Entity ID and ACS URL. Could someone help us debug the configuration?" },
  { subject: "Webhook deliveries are delayed", body: "Our webhook endpoint is receiving events with a 15-20 minute delay. We've confirmed our server responds within 200ms. This started after your maintenance window last Tuesday." },
  { subject: "Dashboard charts not loading", body: "The analytics dashboard has been showing a blank white space where the charts should be since this morning. I've tried Chrome and Firefox, cleared cache, and disabled extensions. Still not working." },
  { subject: "Mobile app crashes on startup", body: "After updating to version 3.2.1, the iOS app crashes immediately on launch. I'm on iPhone 14 Pro running iOS 17.4. I've tried reinstalling but the issue persists." },
  { subject: "Custom field validation not working", body: "I created a custom field with regex validation pattern ^[A-Z]{3}-\\d{4}$ but it's accepting values that don't match the pattern. For example, 'abc-1234' passes validation when it shouldn't." },
  { subject: "Report generation timing out", body: "When I try to generate a report for the full year (Jan-Dec 2025), the request times out after about 30 seconds. Monthly reports work fine. Is there a way to generate larger reports?" },
  { subject: "File upload size limit error", body: "I'm getting a 'File too large' error when uploading a 25MB PDF. Your docs say the limit is 50MB. Is this a bug or has the limit changed?" },
  { subject: "GraphQL query returning null for nested fields", body: "When I query for user { projects { tasks } }, the tasks field always returns null even though there are tasks in those projects. Direct task queries work fine." },
  { subject: "Email notifications going to spam", body: "Multiple team members are reporting that notification emails from your platform are landing in their spam folders in Gmail. We've added your domain to our allowlist but it's still happening." },
  { subject: "Database connection pool exhaustion", body: "We're seeing intermittent 'connection pool exhausted' errors in our self-hosted instance during peak hours (around 2-4 PM EST). We have max_connections set to 100. What's the recommended configuration?" },
  { subject: "OAuth token refresh failing", body: "Our OAuth integration stopped refreshing tokens automatically. The refresh token endpoint returns a 400 error with 'invalid_grant'. This affects all users who connected more than 24 hours ago." },
  { subject: "Search indexing seems broken", body: "Full-text search hasn't been returning results for documents uploaded in the last week. Older documents search fine. Looks like new content isn't being indexed." },
];

const refundRequests = [
  { subject: "Requesting refund for double charge", body: "I was charged twice for my monthly subscription on April 3rd — $49.99 appeared on my statement two times. Could you please refund the duplicate charge? My account email is the one I'm writing from." },
  { subject: "Refund request — service not as described", body: "I signed up for the Pro plan expecting the advanced analytics feature described on your pricing page, but after upgrading I found out it's only available on Enterprise. I'd like a refund for the current billing period." },
  { subject: "Cancel and refund — haven't used the service", body: "I signed up for a paid plan last week but haven't had time to use it at all. I'd like to cancel and request a full refund since I haven't utilized any of the paid features." },
  { subject: "Refund for unused months after cancellation", body: "I cancelled my annual subscription 3 months in. I was told I'd receive a prorated refund for the remaining 9 months but haven't seen it yet. It's been two weeks since cancellation." },
  { subject: "Charged after cancellation", body: "I cancelled my subscription on March 15th and received a confirmation email. However, I was still charged $29.99 on April 1st. Please refund this charge and ensure no further charges occur." },
  { subject: "Wrong plan charged", body: "I selected the Basic plan at $19/month during signup but I'm being charged $49/month for Pro. I never selected or agreed to the Pro plan. Please refund the difference and switch me to Basic." },
  { subject: "Refund for downtime last week", body: "Your platform was down for nearly 8 hours last Thursday, which caused significant disruption to our team's workflow. Given the extended outage, we'd like to request a credit or partial refund." },
  { subject: "Trial converted to paid without consent", body: "I signed up for the free trial and intended to cancel before it ended. I didn't receive any reminder email and was charged $99. I'd like a refund as I never intended to continue past the trial." },
  { subject: "Accidental annual plan purchase", body: "I meant to select the monthly plan but accidentally purchased the annual plan for $499. I noticed immediately and would like to switch to monthly and get a refund for the difference." },
  { subject: "Feature removed that I'm paying for", body: "The bulk export feature was removed in your latest update, but that was the primary reason I'm on the Pro plan. Since the feature I'm paying for no longer exists, I'd like a refund or downgrade." },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName() {
  return { first: pick(firstNames), last: pick(lastNames) };
}

function randomEmail(first: string, last: string) {
  const sep = pick([".", "_", ""]);
  const num = Math.random() > 0.5 ? Math.floor(Math.random() * 99) : "";
  return `${first.toLowerCase()}${sep}${last.toLowerCase()}${num}@${pick(domains)}`;
}

function randomDate(daysBack: number) {
  const now = Date.now();
  const past = now - daysBack * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

async function seedTickets() {
  const count = 100;
  console.log(`Seeding ${count} tickets...`);

  const tickets = [];

  for (let i = 0; i < count; i++) {
    const category = pick(categories);
    const status = pick(statuses);
    const { first, last } = randomName();
    const email = randomEmail(first, last);
    const createdAt = randomDate(30);

    let template: { subject: string; body: string };
    if (category === "GENERAL_QUESTION") {
      template = pick(generalQuestions);
    } else if (category === "TECHNICAL_QUESTION") {
      template = pick(technicalQuestions);
    } else {
      template = pick(refundRequests);
    }

    tickets.push({
      subject: template.subject,
      body: template.body,
      senderEmail: email,
      senderName: `${first} ${last}`,
      status,
      category,
      createdAt,
      updatedAt: createdAt,
      resolvedAt: status === "RESOLVED" || status === "CLOSED"
        ? new Date(createdAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000)
        : null,
    });
  }

  await prisma.ticket.createMany({ data: tickets });
  console.log(`Successfully seeded ${count} tickets.`);
}

seedTickets()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
