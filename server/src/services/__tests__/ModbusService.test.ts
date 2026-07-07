import test from 'node:test'
import assert from 'node:assert/strict'
import { ModbusService } from '../ModbusService.js'

test('writeRegister uses single-register writes for PLC values', async () => {
  const service = new ModbusService() as any
  service._connected = 'connected'

  let writeRegisterCalled = false
  let writeRegistersCalled = false

  service.client = {
    connectTCP: async () => undefined,
    setID: () => undefined,
    setTimeout: () => undefined,
    close: async () => undefined,
    writeRegister: async (address: number, value: number) => {
      writeRegisterCalled = true
      assert.equal(address, 20002)
      assert.equal(value, 17)
    },
    writeRegisters: async () => {
      writeRegistersCalled = true
      throw new Error('writeRegisters should not be used for single-register writes')
    },
  }

  const ok = await service.writeRegister(20002, 17)

  assert.equal(ok, true)
  assert.equal(writeRegisterCalled, true)
  assert.equal(writeRegistersCalled, false)
})
