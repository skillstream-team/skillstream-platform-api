# Pricing, Access & Subscription Pool

## Teacher-set prices (required)

- **Programs**: Teachers must set an individual price when creating/updating a program. Validated in `createCourseSchema` (price required).
- **Modules**: Teachers must set an individual price when creating/updating a module. Validated in `createModuleSchema` (price required) and in lesson routes.

## Student-facing price (+10% platform markup)

- The price teachers set is **not** the final price shown to students.
- **Student price** = teacher price + 10% platform markup.
- Implemented in:
  - `MonetizationService.getStudentPrice()` and `getAccessRequirements()` (returns `studentPrice`).
  - Program/module list and detail API responses include `studentPrice` (see `service.ts`, `lessons.routes.ts`).
- Frontend shows `studentPrice` when present, otherwise falls back to `price * 1.1` for backward compatibility.

## How students access material

1. **Buy a program**  
   When a student buys a program, they get access to **all modules in that program**.  
   Access is enforced in `MonetizationService.canAccess()`: for a module, we check if the module belongs to a program and the student is enrolled in that program.

2. **Subscription**  
   If a student has an **active subscription**, they can access **everything on the platform** (all programs and modules).  
   Implemented in `MonetizationService.canAccess()`: we first check for an active subscription (status COMPLETED, not expired) and return `true` for any content before checking program enrollment or direct module payment.

## Teacher pay from subscription pool

- Teachers are paid from the **subscription revenue pool** based on **engagement per student** on their modules and programs.
- Implemented in:
  - `SubscriptionRevenueService` (`src/modules/earnings/services/subscription-revenue.service.ts`): calculates monthly pool, platform fee, and teacher pool; distributes revenue to teachers based on watch time and engagements.
  - `SubscriptionRevenuePool` and related models in Prisma.
- Engagement is tracked (e.g. `StudentEngagement`, watch time, completions) and used to allocate the teacher pool proportionally.
