import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('contact');
    if (!hasTable) {
        await knex.schema.createTable('contact', table => {
            table.increments('id').primary()
            table.string('phone_number').nullable()
            table.string('email').nullable()
            table.integer('linked_id').nullable()
            table.enum('link_precedence', ['primary', 'secondary']).notNullable()
            table.timestamp('created_at').defaultTo(knex.fn.now())
            table.timestamp('updated_at').defaultTo(knex.fn.now())
            table.timestamp('deleted_at').nullable()
        });
    }
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('contact');
}

