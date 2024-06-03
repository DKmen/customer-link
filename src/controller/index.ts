import { Request, Response } from 'express';

import { logger } from '../helper/logger';
import { ContactRW } from '../models/contact';

import type { BaseError } from '../errors.js';
import LinkPrecedence from '../types/LinkStatus';

interface IdentifyBody {
    email?: string;
    phoneNumber?: string;
}

export async function identify(req: Request<unknown, unknown, IdentifyBody>, res: Response) {
    const { email, phoneNumber } = req.body;

    logger.info('Identify request received');
    logger.debug({ email, phoneNumber });

    const trx = await ContactRW.startTransaction();

    try {

        // find primary contacts with email or phone number provided
        const primaryContacts = (await ContactRW.query(trx).where('email', "=", email ?? null).orWhere('phone_number', "=", phoneNumber ?? null)).filter(contact => contact.linkPrecedence === LinkPrecedence.PRIMATY);
        logger.info('primary contacts found successfully');
        logger.debug({ primaryContacts, lenght: primaryContacts.length })


        // if primary contacts are more than 1, then update primary contact with the first contact and update secondary contacts with the rest
        if (primaryContacts.length >= 2) {
            // make first contact as primary contact
            const primaryContact = primaryContacts[0];
            logger.debug('primary contact found', primaryContact);

            // declare secondary contacts array
            const secondaryContacts = []

            // get all secondary contacts of primary contacts
            secondaryContacts.push(...(await ContactRW.query(trx).where('linked_id', primaryContact?.id ?? 0)));

            // get all secondary contacts of rest of the primary contacts and add them to secondary contacts array and also add primary contact to secondary contacts array
            for (let i = 1; i < primaryContacts.length; i++) {
                const tmp = await ContactRW.query(trx).where('linked_id', primaryContacts[i]?.id ?? 0);
                secondaryContacts.push(primaryContacts[i]);
                secondaryContacts.push(...tmp);
            }

            // update secondary contacts with first primary contact and link precedence as secondary
            for (let i = 0; i < secondaryContacts.length; i++) {
                await secondaryContacts[i]?.$query(trx).patch({ linkPrecedence: LinkPrecedence.SECONDARY, linkedId: primaryContact?.id });
            }
            logger.debug('secondary contacts updated successfully', secondaryContacts)

            // commit transaction
            await trx.commit();

            const contact = {
                primaryContatctId: primaryContact?.id,
                emails: [...new Set([...secondaryContacts.map(contact => contact?.email)])].filter(email => email !== null),
                phoneNumbers: [...new Set([...secondaryContacts.map(contact => contact?.phoneNumber)])].filter(phoneNumber => phoneNumber !== null),
                secondaryContactIds: [...new Set([...secondaryContacts.map(contact => contact?.id)])].filter(id => id !== null)
            }
            logger.debug('response', contact)

            // send response
            res.status(200).json({
                contact
            });

            return;
        } else {

            // make first contact as primary contact
            const primaryContact = primaryContacts[0];

            // if primary contact is not found, then create new contact with email and phone number provided
            if (primaryContact === undefined) {
                logger.info('Contact not found');

                // create new contact
                const contact = await ContactRW.query(trx).insert({
                    email,
                    phoneNumber,
                    linkPrecedence: LinkPrecedence.PRIMATY
                });
                logger.debug('Contact created successfully', contact);

                // commit transaction
                await trx.commit();
                logger.debug('Transaction committed successfully');

                const contactResponce = {
                    primaryContatctId: contact.id,
                    emails: [contact.email],
                    phoneNumbers: [contact.phoneNumber],
                    secondaryContactIds: []
                }
                logger.debug('response', contactResponce);

                // send response
                res.status(200).json({
                    contact: contactResponce
                });

                return;
            } else {

                // find secondary contacts of primary contact
                const secondaryContacts = await ContactRW.query(trx).where('linked_id', primaryContact.id)
                logger.debug('secondary contacts found successfully', secondaryContacts);

                // check if email and phone number provided are already present in primary contact or secondary contacts
                const isContaines = secondaryContacts.some(contact => contact.email === (email ?? null) && contact.phoneNumber === (phoneNumber ?? null));
                logger.debug('isContaines', isContaines);

                // if email and phone number provided are already present in primary contact or secondary contacts, then send response with primary contact, secondary contacts and emails and phone numbers
                logger.debug('is exist', (primaryContact.email === (email ?? null) && primaryContact.phoneNumber === (phoneNumber ?? null)) || isContaines);
                if ((primaryContact.email === (email ?? null) && primaryContact.phoneNumber === (phoneNumber ?? null)) || isContaines) {
                    // commit transaction
                    await trx.commit();
                    logger.debug('Transaction committed successfully');

                    const contactResponce = {
                        primaryContatctId: primaryContact.id,
                        emails: [...(new Set([primaryContact.email, ...secondaryContacts.map(contact => contact.email)]))].filter(email => email !== null && email !== undefined),
                        phoneNumbers: [...new Set([primaryContact.phoneNumber, ...secondaryContacts.map(contact => contact.phoneNumber)].filter(phoneNumber => phoneNumber !== null && phoneNumber !== undefined))],
                        secondaryContactIds: [...secondaryContacts.map(contact => contact.id)]
                    }
                    logger.debug('response', contactResponce);

                    // send response
                    res.status(200).json({
                        contact: contactResponce
                    });

                    return;
                } else {
                    // create new contact with email and phone number provided
                    const contact = await ContactRW.query(trx).insert({
                        email,
                        phoneNumber,
                        linkedId: primaryContact.id,
                        linkPrecedence: LinkPrecedence.SECONDARY
                    });
                    console.log( contact);

                    // commit transaction
                    await trx.commit();
                    logger.debug('Transaction committed successfully');

                    const contactResponce = {
                        primaryContatctId: primaryContact.id,
                        emails: [...(new Set([primaryContact.email,contact.email, ...secondaryContacts.map(contact => contact.email)]))].filter(email => email !== null && email !== undefined),
                        phoneNumbers: [...new Set([primaryContact.phoneNumber,contact.phoneNumber, ...secondaryContacts.map(contact => contact.phoneNumber)].filter(phoneNumber => phoneNumber !== null && phoneNumber !== undefined))],
                        secondaryContactIds: [...secondaryContacts.map(contact => contact.id),contact.id]
                    }
                    logger.debug('response', contactResponce);

                    // send response
                    res.status(200).json({
                        contact: contactResponce
                    });

                    return;
                }
            }
        }
    } catch (error) {
        logger.error(error);
        logger.info('Error in verifyMegicLink');

        // rollback transaction
        await trx.rollback();
        logger.debug('Transaction rollback successfully');

        // send error response
        res.status(400).json({ errors: [error as BaseError] });
    }

}