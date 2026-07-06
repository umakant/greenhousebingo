#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Seeds real Web Development LMS courses (HTML/CSS, JavaScript, React/Next.js, live bootcamp, Node APIs).
 *
 * This is an alias — curriculum lives in scripts/lms-web-dev-courses-data.js
 * and is applied by scripts/seed-lms-demo-data.js (portal users, enrollments, reviews, etc.).
 *
 * Run: npm run db:seed:lms-web-dev
 * Prerequisite: npm run db:seed:company
 */
require("./seed-lms-demo-data.js");
