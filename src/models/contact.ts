import { Model, snakeCaseMappers } from 'objection'
import Knex from 'knex'
import type { ColumnNameMappers } from 'objection'

import { formatToDBTimestamp } from '../helper/helpers.js'
import { writeConfig, readOnlyConfig } from '../../knexfile.js'
import LinkPrecedence from '../types/LinkStatus.js'

const knexWrite = Knex(writeConfig)
const knexReadOnly = Knex(readOnlyConfig)

class Contact extends Model {
    id!: number
    phoneNumber!: string
    email!: string
    linkedId!: number
    linkPrecedence!: LinkPrecedence
    createdAt!: string
    updatedAt!: string
    deletedAt!: string


    static override tableName = 'contact'
    static override idColumn = ['id']

    static override jsonSchema = {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            phoneNumber: { type: 'string' },
            email: { type: 'string' },
            linkedId: { type: 'integer' },
            linkPrecedence: { type: 'string' },
        }
    }

    override $beforeInsert(): void {
        this.createdAt = formatToDBTimestamp(new Date())
        this.updatedAt = formatToDBTimestamp(new Date())
    }

    override $beforeUpdate(): void {
        this.updatedAt = formatToDBTimestamp(new Date())
    }

    static override get columnNameMappers(): ColumnNameMappers {
        return snakeCaseMappers()
    }
}

export const ContactRW = Contact.bindKnex(knexWrite)
export const ContactRO = Contact.bindKnex(knexReadOnly)

export default Contact
