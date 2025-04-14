import { PrismaService } from "src/prisma.service";
import { timeFormmatForDB } from "./reservation.utils";
import { PrismaClient } from "@prisma/client";
import { ITXClientDenyList } from "@prisma/client/runtime/library";

export async function findConflictReservations(prisma: Omit<PrismaClient, ITXClientDenyList>, options: { date: string, startTime: string, endTime: string, notIncludeId?: number }): Promise<{ reservationId: number }[]> {

    const { date, startTime, endTime, notIncludeId } = options;

    const reservationDate = new Date(`${date}`)

    const newStart = timeFormmatForDB(startTime)
    const newEnd = timeFormmatForDB(endTime)
    if (notIncludeId) {
        const findReservations = await prisma.$queryRawUnsafe<{ reservationId: number }[]>(
            `
            SELECT reservationId
            FROM Reservation
            WHERE date = ?
            AND NOT reservationId = ?
            AND startTime < ?
            AND endTime > ?;
        `,
            reservationDate.toISOString().split('T')[0],
            notIncludeId,
            newEnd.toUTCString().split(' ')[4],
            newStart.toUTCString().split(' ')[4]
        );

        return findReservations || [];
    }
    else {
        const findReservations = await prisma.$queryRawUnsafe<{ reservationId: number }[]>(
            `
                SELECT reservationId
                FROM Reservation
                WHERE date = ?
                AND startTime < ?
                AND endTime > ?;
            `,
            reservationDate.toISOString().split('T')[0],
            newEnd.toUTCString().split(' ')[4],
            newStart.toUTCString().split(' ')[4]
        );

        return findReservations || [];
    }
}


export async function someConflictReservation(prisma: Omit<PrismaClient, ITXClientDenyList>, options: { date: string, startTime: string, endTime: string, notIncludeId?: number }): Promise<boolean> {

    const { date, startTime, endTime, notIncludeId } = options;

    const reservationDate = new Date(`${date}`)

    const newStart = timeFormmatForDB(startTime)
    const newEnd = timeFormmatForDB(endTime)

    if (notIncludeId) {
        const someConflictReservation = await prisma.$queryRawUnsafe<{ reservationId: number }[]>(
            `
            SELECT reservationId
            FROM Reservation
            WHERE date = ?
            AND NOT reservationId = ?
            AND startTime < ?
            AND endTime > ?
            LIMIT 1;
        `,
            reservationDate.toISOString().split('T')[0],
            notIncludeId,
            newEnd.toUTCString().split(' ')[4],
            newStart.toUTCString().split(' ')[4]
        );

        return someConflictReservation.length > 0 || false;
    }
    else {
        const someConflictReservation = await prisma.$queryRawUnsafe<{ reservationId: number }[]>(
            `
                SELECT reservationId
                FROM Reservation
                WHERE date = ?
                AND startTime < ?
                AND endTime > ?
                LIMIT 1;
            `,
            reservationDate.toISOString().split('T')[0],
            newEnd.toUTCString().split(' ')[4],
            newStart.toUTCString().split(' ')[4]
        );

        return someConflictReservation.length > 0 || false;
    }
}