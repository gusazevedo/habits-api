import {prisma} from "./lib/prisma";
import {FastifyInstance} from "fastify";
import {z} from 'zod';
import dayjs from "dayjs";

export async function appRoutes(app: FastifyInstance) {
    app.post('/habits', async (request) => {
        const createhabitBody = z.object({
            title: z.string(),
            weekDays: z.array(
                z.number()
                    .min(0)
                    .max(6)
            )
        });

        const {title, weekDays} = createhabitBody.parse(request.body);
        const today = dayjs().startOf('day').toDate();

        await prisma.habit.create({
            data: {
                title,
                created_at: today,
                WeekDays: {
                    create: weekDays.map(weekDay => {
                        return {
                            week_day: weekDay
                        }
                    })
                }
            }
        })
    });

    app.get('/day', async (request) => {
        const getDayParams = z.object({
            // Converte o valor enviado pelo front
            // de string para o objeto Date.
            date: z.coerce.date()
        });

        const {date} = getDayParams.parse(request.query);
        const parsedDate = dayjs(date).startOf('day');
        const weekDay = parsedDate.get('day');

        const possibleHabits = await prisma.habit.findMany({
            where: {
                created_at: {
                    lte: date,
                },
                WeekDays: {
                    some: {
                        week_day: weekDay
                    }
                }
            }
        });

        const day = await prisma.day.findUnique({
            where: {
                date: parsedDate.toDate(),
            },
            include: {
                DayHabit: true,
            }
        });

        const completedHabits = day?.DayHabit.map(dayHabit => {
            return dayHabit.habit_id
        })

        return {
            possibleHabits,
            completedHabits
        };
    });
}