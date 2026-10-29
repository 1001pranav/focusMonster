package expo.modules.usagestats

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ServiceSwitchTest {
  private val pkg = "com.focusmonster.app"
  private val cls = "expo.modules.usagestats.FocusAccessibilityService"
  private val me = "$pkg/$cls"

  @Test
  fun `finds the service among others`() {
    assertTrue(ServiceSwitch.contains("com.other/.Reader:$me", pkg, cls))
    assertFalse(ServiceSwitch.contains("com.other/.Reader", pkg, cls))
    assertFalse(ServiceSwitch.contains(null, pkg, cls))
  }

  @Test
  fun `understands the short form for a class inside the package`() {
    assertTrue(ServiceSwitch.contains("$pkg/.Gate", pkg, "$pkg.Gate"))
  }

  @Test
  fun `adds without dropping other services`() {
    assertEquals("com.other/.Reader:$me", ServiceSwitch.added("com.other/.Reader", me))
    assertEquals(me, ServiceSwitch.added("", me))
    assertEquals(me, ServiceSwitch.added(null, me))
  }
}
