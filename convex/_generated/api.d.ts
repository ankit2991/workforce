/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as advances from "../advances.js";
import type * as agencies from "../agencies.js";
import type * as attendance from "../attendance.js";
import type * as branches from "../branches.js";
import type * as http from "../http.js";
import type * as igaming from "../igaming.js";
import type * as igamingProvider from "../igamingProvider.js";
import type * as lib_auth from "../lib/auth.js";
import type * as marketplace from "../marketplace.js";
import type * as notifications from "../notifications.js";
import type * as remittances from "../remittances.js";
import type * as reports from "../reports.js";
import type * as sites from "../sites.js";
import type * as userRoles from "../userRoles.js";
import type * as users from "../users.js";
import type * as wages from "../wages.js";
import type * as wallet from "../wallet.js";
import type * as withdrawals from "../withdrawals.js";
import type * as workerPortal from "../workerPortal.js";
import type * as workers from "../workers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  advances: typeof advances;
  agencies: typeof agencies;
  attendance: typeof attendance;
  branches: typeof branches;
  http: typeof http;
  igaming: typeof igaming;
  igamingProvider: typeof igamingProvider;
  "lib/auth": typeof lib_auth;
  marketplace: typeof marketplace;
  notifications: typeof notifications;
  remittances: typeof remittances;
  reports: typeof reports;
  sites: typeof sites;
  userRoles: typeof userRoles;
  users: typeof users;
  wages: typeof wages;
  wallet: typeof wallet;
  withdrawals: typeof withdrawals;
  workerPortal: typeof workerPortal;
  workers: typeof workers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
