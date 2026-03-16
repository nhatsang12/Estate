const cron = require('node-cron');
const Transaction = require('../models/Transaction');

const CLEANUP_CRON_SCHEDULE = process.env.TRANSACTION_CLEANUP_CRON || '*/5 * * * *';
const EXPIRED_TRANSACTION_MESSAGE = 'Transaction expired due to inactivity';
const FALLBACK_EXPIRY_MINUTES = 10;

let cleanupTask = null;
let isCleanupRunning = false;

const runTransactionCleanup = async () => {
  if (isCleanupRunning) {
    console.warn('[Transaction Cleanup] Previous run is still in progress. Skipping this cycle.');
    return;
  }

  isCleanupRunning = true;

  try {
    const now = new Date();
    const fallbackCutoff = new Date(now.getTime() - FALLBACK_EXPIRY_MINUTES * 60 * 1000);
    const expiredTransactions = await Transaction.find({
      status: 'pending',
      $or: [
        { expiresAt: { $lt: now } },
        { expiresAt: { $exists: false }, orderedAt: { $lt: fallbackCutoff } },
      ],
    })
      .select('_id paymentGatewayResponse expiresAt')
      .lean();

    if (!expiredTransactions.length) {
      console.log(
        ``
      );
      return;
    }

    const bulkOperations = expiredTransactions.map((transaction) => {
      const previousGatewayResponse =
        transaction.paymentGatewayResponse &&
        typeof transaction.paymentGatewayResponse === 'object' &&
        !Array.isArray(transaction.paymentGatewayResponse)
          ? transaction.paymentGatewayResponse
          : {};

      return {
        updateOne: {
          filter: { _id: transaction._id, status: 'pending' },
          update: {
            $set: {
              status: 'cancelled',
              paymentGatewayResponse: {
                ...previousGatewayResponse,
                phase: 'expired_by_cleanup',
                message: EXPIRED_TRANSACTION_MESSAGE,
                expiredAt: now.toISOString(),
              },
              updatedAt: now,
            },
          },
        },
      };
    });

    const writeResult = await Transaction.bulkWrite(bulkOperations, { ordered: false });
    const cancelledCount = Number(writeResult.modifiedCount || 0);

    console.log(
      `[Transaction Cleanup] Cancelled ${cancelledCount}/${expiredTransactions.length} expired pending transaction(s) at ${now.toISOString()}.`
    );

    if (cancelledCount !== expiredTransactions.length) {
      const missedCount = expiredTransactions.length - cancelledCount;
      console.warn(
        `[Transaction Cleanup] ${missedCount} transaction(s) were not cancelled (likely processed concurrently).`
      );
    }
  } catch (error) {
    console.error('[Transaction Cleanup] Failed to cleanup expired transactions:', error);
  } finally {
    isCleanupRunning = false;
  }
};

const startTransactionCleanupJob = () => {
  if (cleanupTask) {
    console.log('[Transaction Cleanup] Scheduler already started.');
    return cleanupTask;
  }

  cleanupTask = cron.schedule(CLEANUP_CRON_SCHEDULE, runTransactionCleanup, {
    scheduled: true,
  });

  console.log(
    `[Transaction Cleanup] Scheduler started with cron "${CLEANUP_CRON_SCHEDULE}".`
  );

  return cleanupTask;
};

module.exports = {
  startTransactionCleanupJob,
  runTransactionCleanup,
};
