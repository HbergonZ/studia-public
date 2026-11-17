<?php
namespace Tests\Unit;
use App\Services\ConfigurationInput;
use CodeIgniter\Test\CIUnitTestCase;
final class ConfigurationInputTest extends CIUnitTestCase
{
    public function testPreservesUnchangedFieldsAndValidatesAllDaysBeforeSaving(): void
    {
        [$profile,$days] = (new ConfigurationInput())->validate(['availability' => [0 => 60,6 => 0]], ['block_minutes' => 30,'break_minutes' => 7,'weekly_question_goal' => 10,'weekly_minutes_goal' => 120,'timezone' => 'America/Manaus']);
        $this->assertSame(30,$profile['block_minutes']); $this->assertSame(7,$profile['break_minutes']); $this->assertSame([0 => 60,6 => 0],$days);
    }
    public function testRejectsInvalidDay(): void { $this->expectException(\InvalidArgumentException::class); (new ConfigurationInput())->validate(['availability' => [0 => 10,1 => -1]],null); }
    public function testRejectsInvalidZone(): void { $this->expectException(\InvalidArgumentException::class); (new ConfigurationInput())->validate(['timezone' => 'invalid'],null); }
    public function testRejectsFractionalGoal(): void { $this->expectException(\InvalidArgumentException::class); (new ConfigurationInput())->validate(['weekly_question_goal' => 1.5],null); }
}
