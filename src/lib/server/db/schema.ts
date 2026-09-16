import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const workWindows = sqliteTable(
	'work_windows',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		side: text('side', { enum: ['job', 'phd'] }).notNull(),
		day: text('day').notNull(),
		startTs: integer('start_ts').notNull(),
		// NULL ⇒ running timer
		endTs: integer('end_ts'),
		note: text('note'),
		createdAt: integer('created_at').notNull()
	},
	(t) => [
		index('idx_windows_day').on(t.day),
		index('idx_windows_side_day').on(t.side, t.day),
		// at most one running timer; NULLs are distinct in unique indexes, so index a constant
		uniqueIndex('idx_one_running')
			.on(sql`("end_ts" IS NULL)`)
			.where(sql`"end_ts" IS NULL`)
	]
);

export const dayMarks = sqliteTable('day_marks', {
	day: text('day').primaryKey(),
	type: text('type', { enum: ['sick', 'vacation', 'holiday', 'home_office'] }).notNull(),
	note: text('note'),
	source: text('source', { enum: ['auto'] }), // 'auto' = generated public holiday
	createdAt: integer('created_at').notNull()
});

export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	// JSON-encoded
	value: text('value').notNull()
});

export type WorkWindowRow = typeof workWindows.$inferSelect;
