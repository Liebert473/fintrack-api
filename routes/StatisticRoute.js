import express from 'express';
import dayjs from 'dayjs';
const router = express.Router()
import fs from "fs";
import { GetTransactions } from './TransactionRoute';

router.get('/api/totalSum/:date', async (req, res) => {
    const { account, type } = req.query;
    const date = req.params.date;

    const start = dayjs(date).startOf('month').format('YYYY-MM-DD');
    const end = dayjs(date).endOf('month').format('YYYY-MM-DD');

    let transactions = await GetTransactions();

    const sum = transactions
        .filter(x =>
            x.account === account &&
            x.date >= start &&
            x.date <= end &&
            x.type === type
        )
        .reduce((x, y) => x + y.amount, 0);

    res.json(sum);
});


router.get('/api/statistic', async (req, res) => {
    const { from, to, view, type } = req.query;
    let transactions = await GetTransactions()

    if (view == "daily") {
        function ReturnDays(from, to) {
            let days = [];

            const end = to
                ? dayjs(to)
                : from
                    ? dayjs(from).add(7, 'day')
                    : dayjs();

            const start = from
                ? dayjs(from)
                : to
                    ? dayjs(to).subtract(7, 'day')
                    : end.subtract(7, 'day');

            let current = start;

            while (current <= end) {
                days.push(current.format('YYYY-MM-DD'));
                current = current.add(1, 'day');
            }

            return days;
        }

        let data = ReturnDays(from, to)
        data = data.map(x => ({
            name: dayjs(x).format('ddd'),
            date: x,
            amount: transactions.filter(y => y.date === x && y.type === type).reduce((acc, val) => acc + val.amount, 0)
        }));

        res.json(data)
    } else if (view == "monthly") {
        function ReturnMonths(from, to) {
            let months = [];

            const end = to
                ? dayjs(to, 'YYYY-MM')
                : from
                    ? dayjs(from, 'YYYY-MM').add(6, 'month')
                    : dayjs().startOf('month');

            let current = from
                ? dayjs(from, 'YYYY-MM').startOf('month')
                : end.subtract(6, 'month').startOf('month');

            while (current <= end) {
                months.push({
                    name: current.format('MMMM'),
                    date: current.format('YYYY-MM')
                });

                current = current.add(1, 'month');
            }

            return months;
        }

        function isFallIn(month, date) {
            const start = dayjs(month).startOf("month").format("YYYY-MM-DD")
            const end = dayjs(month).endOf("month").format("YYYY-MM-DD")

            return date >= start && date <= end
        }

        let monthsData = ReturnMonths(from, to);
        monthsData = monthsData.map(month => ({
            ...month,
            amount: transactions.filter(transaction =>
                isFallIn(month.date, transaction.date) && transaction.type === type
            ).reduce((acc, val) => acc + val.amount, 0)
        }));

        res.json(monthsData)
    } else if (view == 'yearly') {
        function ReturnYears(from, to) {
            let years = []

            const end = to
                ? dayjs(to, 'YYYY')
                : from
                    ? dayjs(from, 'YYYY').add(5, 'year')
                    : dayjs().startOf('year')

            let current = from
                ? dayjs(from, 'YYYY').startOf('year')
                : end.subtract(5, 'year').startOf('year')

            while (current <= end) {
                years.push(
                    {
                        name: current.format('YYYY'),
                        date: current.format('YYYY')
                    }
                )

                current = current.add(1, 'year')
            }

            return years
        }

        function isFallIn(year, date) {
            const start = dayjs(year).startOf('year').format('YYYY-MM-DD')
            const end = dayjs(year).endOf('year').format('YYYY-MM-DD')

            return date >= start && date <= end
        }

        let yearsData = ReturnYears(from, to)
        yearsData = yearsData.map(year => ({
            ...year,
            amount: transactions.filter(x => (
                isFallIn(year.date, x.date) && x.type == type
            )).reduce((x, y) => x + y.amount, 0)
        }))

        res.json(yearsData)
    }
});

export default router