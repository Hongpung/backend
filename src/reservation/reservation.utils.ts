/**
 * 클라이언트 반환을 위한 포맷
 * @param time Date 포맷
 * @returns hh:mm 포맷
 */
export function timeFormmatForClient(time: Date): string {
    console.log(time)
    const koreanTime = new Date(time.getTime() + 9 * 60 * 60 * 1000)
    const parseTime = koreanTime.toISOString().split('T')[1]
    const [hours, minutes] = parseTime.split(':')

    return `${hours}:${minutes}`
}

/**
 * DB삽입을 위한 포맷
 * @param timeString hh:mm 포맷
 * @returns Date
 */
export function timeFormmatForDB(time: string): Date {
    const formmatedDate = new Date(`1970-01-01T${time}+09:00`)
    return formmatedDate;
}


/**
 * DB삽입을 위한 포맷
 * @param dateString yyyy-mm-dd 포맷
 * @returns Date
 */
export function dateFormmatForDB(date: string): Date {
    const formmatedDate = new Date(`${date}T00:00Z`)
    return formmatedDate;
}