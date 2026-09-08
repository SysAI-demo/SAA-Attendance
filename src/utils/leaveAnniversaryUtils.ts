import { Employee, GradeDefinition, LeaveDefinition } from '../types';

export interface LeaveCycleInfo {
  joinedDate: string;
  anniversaryMonthDay: string; // MM-DD
  anniversaryFormatted: string; // e.g. "March 15"
  currentCycleStart: string; // YYYY-MM-DD
  currentCycleEnd: string; // YYYY-MM-DD
  nextAnniversaryDate: string; // YYYY-MM-DD
  daysUntilNextRefill: number;
  yearsOfService: number;
  isAnniversaryToday: boolean;
  lastRefillDate?: string;
}

export interface AnnualLeaveQuota {
  casual: number;
  sick: number;
  annual: number;
}

/**
 * Calculates default or grade-based annual quota for an employee
 */
export function getEmployeeAnnualQuota(
  employee: Employee,
  gradeDefinitions?: GradeDefinition[],
  leaveDefinitions?: LeaveDefinition[]
): AnnualLeaveQuota {
  // If employee has a customized allowance configured, use it
  if (employee.annualLeaveAllowance) {
    return {
      casual: employee.annualLeaveAllowance.casual ?? 12,
      sick: employee.annualLeaveAllowance.sick ?? 10,
      annual: employee.annualLeaveAllowance.annual ?? 18,
    };
  }

  // Find assigned grade multiplier if available
  let annualMultiplier = 1.0;
  if (gradeDefinitions && employee.gradeId) {
    const grade = gradeDefinitions.find(
      (g) => g.id === employee.gradeId || g.gradeCode === employee.gradeId
    );
    if (grade?.annualLeaveMultiplier) {
      annualMultiplier = grade.annualLeaveMultiplier;
    }
  }

  // Base quota from leave definitions if available
  let baseCasual = 12;
  let baseSick = 10;
  let baseAnnual = 18;

  if (leaveDefinitions && leaveDefinitions.length > 0) {
    const cl = leaveDefinitions.find((l) => l.code === 'CL');
    const sl = leaveDefinitions.find((l) => l.code === 'SL');
    const al = leaveDefinitions.find((l) => l.code === 'AL');
    if (cl?.annualQuotaDays) baseCasual = cl.annualQuotaDays;
    if (sl?.annualQuotaDays) baseSick = sl.annualQuotaDays;
    if (al?.annualQuotaDays) baseAnnual = al.annualQuotaDays;
  }

  return {
    casual: baseCasual,
    sick: baseSick,
    annual: Math.round(baseAnnual * annualMultiplier),
  };
}

/**
 * Calculates the exact leave year cycle, next refill date, and days remaining
 * based on the employee's date of joining.
 */
export function calculateLeaveCycle(
  joinedDateStr?: string,
  referenceDate: Date = new Date()
): LeaveCycleInfo {
  // Fallback if no joinedDate is provided
  const joinedDate = joinedDateStr && !isNaN(Date.parse(joinedDateStr))
    ? new Date(joinedDateStr + 'T00:00:00')
    : new Date('2023-01-01T00:00:00');

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  const joinYear = joinedDate.getFullYear();
  const joinMonth = joinedDate.getMonth(); // 0-11
  const joinDay = joinedDate.getDate(); // 1-31

  // Format month and day (MM-DD)
  const pad = (n: number) => n.toString().padStart(2, '0');
  const anniversaryMonthDay = `${pad(joinMonth + 1)}-${pad(joinDay)}`;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const anniversaryFormatted = `${monthNames[joinMonth]} ${joinDay}`;

  // Determine current cycle start:
  // Has the anniversary in the reference year occurred yet?
  const thisYearAnniversary = new Date(refYear, joinMonth, joinDay, 0, 0, 0, 0);
  const todayZero = new Date(refYear, refMonth, refDay, 0, 0, 0, 0);

  let currentCycleStartYear: number;
  let nextAnniversaryYear: number;

  if (todayZero >= thisYearAnniversary) {
    // We are at or past this year's anniversary
    currentCycleStartYear = refYear;
    nextAnniversaryYear = refYear + 1;
  } else {
    // We haven't reached this year's anniversary yet, cycle started last year
    currentCycleStartYear = refYear - 1;
    nextAnniversaryYear = refYear;
  }

  const currentCycleStartDate = new Date(currentCycleStartYear, joinMonth, joinDay);
  const nextAnniversaryDateObj = new Date(nextAnniversaryYear, joinMonth, joinDay);

  // Cycle end is the day before the next anniversary
  const currentCycleEndDateObj = new Date(nextAnniversaryDateObj);
  currentCycleEndDateObj.setDate(currentCycleEndDateObj.getDate() - 1);

  // Calculate days until next refill
  const diffMs = nextAnniversaryDateObj.getTime() - todayZero.getTime();
  const daysUntilNextRefill = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Calculate completed years of service
  let yearsOfService = refYear - joinYear;
  if (refMonth < joinMonth || (refMonth === joinMonth && refDay < joinDay)) {
    yearsOfService--;
  }
  yearsOfService = Math.max(0, yearsOfService);

  const isAnniversaryToday = refMonth === joinMonth && refDay === joinDay;

  const formatDateStr = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    joinedDate: formatDateStr(joinedDate),
    anniversaryMonthDay,
    anniversaryFormatted,
    currentCycleStart: formatDateStr(currentCycleStartDate),
    currentCycleEnd: formatDateStr(currentCycleEndDateObj),
    nextAnniversaryDate: formatDateStr(nextAnniversaryDateObj),
    daysUntilNextRefill,
    yearsOfService,
    isAnniversaryToday,
  };
}

export interface RefillResult {
  updatedEmployees: Employee[];
  refilledCount: number;
  refilledEmployees: {
    employee: Employee;
    previousBalance: Employee['leaveBalance'];
    newBalance: Employee['leaveBalance'];
    anniversaryDate: string;
    cycleYear: number;
  }[];
}

/**
 * Checks all employees to see if their work anniversary has arrived/passed since their last refill.
 * If yes, refills leaves back to annual quotas without carry-over.
 */
export function checkAndApplyAnniversaryRefills(
  employees: Employee[],
  gradeDefinitions?: GradeDefinition[],
  leaveDefinitions?: LeaveDefinition[],
  referenceDate: Date = new Date()
): RefillResult {
  const refilledEmployees: RefillResult['refilledEmployees'] = [];

  const updatedEmployees = employees.map((emp) => {
    // If employee is inactive, skip refill or still process if desired (usually active only)
    const cycle = calculateLeaveCycle(emp.joinedDate, referenceDate);
    const quota = getEmployeeAnnualQuota(emp, gradeDefinitions, leaveDefinitions);

    // Eligible anniversary date is the start of the current cycle
    const eligibleAnniversaryDate = cycle.currentCycleStart;

    // Has this cycle's anniversary already been refilled?
    const hasAlreadyRefilledThisCycle =
      emp.lastLeaveRefillDate &&
      new Date(emp.lastLeaveRefillDate + 'T00:00:00') >= new Date(eligibleAnniversaryDate + 'T00:00:00');

    if (!hasAlreadyRefilledThisCycle) {
      // Perform refill without carry-over (reset directly to full annual quota)
      const previousBalance = { ...emp.leaveBalance };
      const newBalance = {
        casual: quota.casual,
        sick: quota.sick,
        annual: quota.annual,
        permissionsCountThisMonth: 0, // Reset monthly permissions as well
      };

      const updatedEmp: Employee = {
        ...emp,
        lastLeaveRefillDate: eligibleAnniversaryDate,
        leaveBalance: newBalance,
      };

      refilledEmployees.push({
        employee: updatedEmp,
        previousBalance,
        newBalance,
        anniversaryDate: cycle.anniversaryFormatted,
        cycleYear: cycle.yearsOfService + 1,
      });

      return updatedEmp;
    }

    return emp;
  });

  return {
    updatedEmployees,
    refilledCount: refilledEmployees.length,
    refilledEmployees,
  };
}

/**
 * Force manual anniversary refill for a specific employee (e.g. administrative 1-click test or reset)
 */
export function forceEmployeeAnniversaryRefill(
  employee: Employee,
  gradeDefinitions?: GradeDefinition[],
  leaveDefinitions?: LeaveDefinition[],
  referenceDate: Date = new Date()
): Employee {
  const cycle = calculateLeaveCycle(employee.joinedDate, referenceDate);
  const quota = getEmployeeAnnualQuota(employee, gradeDefinitions, leaveDefinitions);

  return {
    ...employee,
    lastLeaveRefillDate: cycle.currentCycleStart,
    leaveBalance: {
      casual: quota.casual,
      sick: quota.sick,
      annual: quota.annual,
      permissionsCountThisMonth: 0,
    },
  };
}
