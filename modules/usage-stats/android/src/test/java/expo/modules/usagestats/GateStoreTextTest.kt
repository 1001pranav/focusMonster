package expo.modules.usagestats

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GateStoreTextTest {
  @Test
  fun `JSON null is no text, not the word null`() {
    assertNull(GateStore.text(JSONObject("""{"nextTask": null}"""), "nextTask"))
  }

  @Test
  fun `missing, blank and the literal text null are no text`() {
    assertNull(GateStore.text(JSONObject("{}"), "why"))
    assertNull(GateStore.text(JSONObject("""{"why": "  "}"""), "why"))
    assertNull(GateStore.text(JSONObject("""{"why": "null"}"""), "why"))
  }

  @Test
  fun `keeps real text`() {
    assertEquals("Write the budget screen", GateStore.text(JSONObject("""{"nextTask": "Write the budget screen"}"""), "nextTask"))
  }
}
