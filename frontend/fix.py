f = open('src/app/dashboard/admin/page.tsx', 'r', encoding='utf-8')
c = f.read()
f.close()

old = '''                      {doctorEarnings.map((d: any) => (
                        <tr key={d.doctorProfileId} className="hover:bg-slate-50">
                          <td className="py-3 font-medium text-slate-800">{d.doctorName}</td>
                          <td className="py-3 text-right text-slate-600">{d.completedAppointments}</td>
                          <td className="py-3 text-right text-slate-600">{Number(d.grossRevenue).toLocaleString()}</td>
                          <td className="py-3 text-right text-purple-600">{Number(d.platformCommission).toLocaleString()}</td>
                          <td className="py-3 text-right text-green-600 font-medium">{Number(d.netEarnings).toLocaleString()}</td>
                          <td className="py-3 text-right text-blue-600">{Number(d.totalPaidOut ?? 0).toLocaleString()}</td>
                          <td className="py-3 text-right text-amber-600 font-medium">{Number(d.pendingPayout ?? 0).toLocaleString()}</td>
                          <td className="py-3 text-right">
                            <button onClick={() => setPayoutModal({ doctorProfileId: d.doctorProfileId, doctorName: d.doctorName })}'''

new = '''                      {doctorEarnings.map((d: any) => (
                        <tr key={d.doctorProfileId} className="hover:bg-slate-50">
                          <td className="py-3 font-medium text-slate-800">{d.fullName}</td>
                          <td className="py-3 text-right text-slate-600">{d.totalAppointments}</td>
                          <td className="py-3 text-right text-slate-600">{Number(d.totalEarnings).toLocaleString()}</td>
                          <td className="py-3 text-right text-purple-600">{Number(d.totalCommissionsPaid).toLocaleString()}</td>
                          <td className="py-3 text-right text-green-600 font-medium">{Number(d.totalEarnings - d.totalCommissionsPaid).toLocaleString()}</td>
                          <td className="py-3 text-right text-blue-600">{Number(d.lastPayoutAmount ?? 0).toLocaleString()}</td>
                          <td className="py-3 text-right text-amber-600 font-medium">{Number(d.pendingPayoutAmount ?? 0).toLocaleString()}</td>
                          <td className="py-3 text-right">
                            <button onClick={() => setPayoutModal({ doctorProfileId: d.doctorProfileId, doctorName: d.fullName })}'''

if old in c:
    c = c.replace(old, new, 1)
    open('src/app/dashboard/admin/page.tsx', 'w', encoding='utf-8').write(c)
    print('Done')
else:
    print('ERROR: string not found')
